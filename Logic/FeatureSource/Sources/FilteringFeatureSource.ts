import { Store, UIEventSource } from "../../UIEventSource"
import FilteredLayer, { FilterState } from "../../../Models/FilteredLayer"
import { FeatureSourceForLayer, Tiled } from "../FeatureSource"
import { BBox } from "../../BBox"
import { ElementStorage } from "../../ElementStorage"
import { TagsFilter } from "../../Tags/TagsFilter"
import { Feature } from "geojson"

export default class FilteringFeatureSource implements FeatureSourceForLayer, Tiled {
    public features: UIEventSource<Feature[]> = new UIEventSource([])
    public readonly layer: FilteredLayer
    public readonly tileIndex: number
    public readonly bbox: BBox
    private readonly upstream: FeatureSourceForLayer
    private readonly state: {
        locationControl: Store<{ zoom: number }>
        selectedElement: Store<any>
        globalFilters?: Store<{ filter: FilterState }[]>
        allElements: ElementStorage
    }
    private readonly _alreadyRegistered = new Set<UIEventSource<any>>()
    private readonly _is_dirty = new UIEventSource(false)
    private previousFeatureSet: Set<any> = undefined

    constructor(
        state: {
            locationControl: Store<{ zoom: number }>
            selectedElement: Store<any>
            allElements: ElementStorage
            globalFilters?: Store<{ filter: FilterState }[]>
        },
        tileIndex,
        upstream: FeatureSourceForLayer,
        metataggingUpdated?: UIEventSource<any>
    ) {
        this.tileIndex = tileIndex
        this.bbox = tileIndex === undefined ? undefined : BBox.fromTileIndex(tileIndex)
        this.upstream = upstream
        this.state = state

        this.layer = upstream.layer
        const layer = upstream.layer
        const self = this
        upstream.features.addCallback(() => {
            self.update()
        })

        layer.appliedFilters.addCallback((_) => {
            self.update()
        })

        this._is_dirty.stabilized(1000).addCallbackAndRunD((dirty) => {
            if (dirty) {
                self.update()
            }
        })

        metataggingUpdated?.addCallback((_) => {
            self._is_dirty.setData(true)
        })

        state.globalFilters?.addCallback((_) => {
            self.update()
        })

        this.update()
    }

    private update() {
        const self = this
        const layer = this.upstream.layer
        const features: Feature[] = this.upstream.features.data ?? []
        const includedFeatureIds = new Set<string>()
        const globalFilters = self.state.globalFilters?.data?.map((f) => f.filter)
        const newFeatures = (features ?? []).filter((f) => {
            self.registerCallback(f)

            const isShown: TagsFilter = layer.layerDef.isShown
            const tags = f.properties
            if (isShown !== undefined && !isShown.matchesProperties(tags)) {
                return false
            }
            if (tags._deleted === "yes") {
                return false
            }

            const tagsFilter = Array.from(layer.appliedFilters?.data?.values() ?? [])
            for (const filter of tagsFilter) {
                const neededTags: TagsFilter = filter?.currentFilter
                if (neededTags !== undefined && !neededTags.matchesProperties(f.properties)) {
                    // Hidden by the filter on the layer itself - we want to hide it no matter what
                    return false
                }
            }

            for (const filter of globalFilters ?? []) {
                const neededTags: TagsFilter = filter?.currentFilter
                if (neededTags !== undefined && !neededTags.matchesProperties(f.properties)) {
                    // Hidden by the filter on the layer itself - we want to hide it no matter what
                    return false
                }
            }

            includedFeatureIds.add(f.properties.id)
            return true
        })

        const previousSet = this.previousFeatureSet
        this._is_dirty.setData(false)

        // Is there any difference between the two sets?
        if (previousSet !== undefined && previousSet.size === includedFeatureIds.size) {
            // The size of the sets is the same - they _might_ be identical
            const newItemFound = Array.from(includedFeatureIds).some((id) => !previousSet.has(id))
            if (!newItemFound) {
                // We know that:
                // - The sets have the same size
                // - Every item from the new set has been found in the old set
                // which means they are identical!
                return
            }
        }

        // Something new has been found!
        this.features.setData(newFeatures)
    }

    private registerCallback(feature: any) {
        const src = this.state?.allElements?.addOrGetElement(feature)
        if (src == undefined) {
            return
        }
        if (this._alreadyRegistered.has(src)) {
            return
        }
        this._alreadyRegistered.add(src)

        const self = this
        // Add a callback as a changed tag migh change the filter
        src.addCallbackAndRunD((_) => {
            self._is_dirty.setData(true)
        })
    }
}
