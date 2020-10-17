import {UIElement} from "./UIElement";
import {VerticalCombine} from "./Base/VerticalCombine";
import Translations from "./i18n/Translations";
import {AllKnownLayouts} from "../Customizations/AllKnownLayouts";
import Combine from "./Base/Combine";
import {SubtleButton} from "./Base/SubtleButton";
import State from "../State";
import {VariableUiElement} from "./Base/VariableUIElement";
import {PersonalLayout} from "../Logic/PersonalLayout";
import {Layout} from "../Customizations/Layout";


export class MoreScreen extends UIElement {

    
    constructor() {
        super(State.state.locationControl);
        this.ListenTo(State.state.osmConnection.userDetails);
        this.ListenTo(State.state.installedThemes);
        
        State.state.installedThemes.addCallback(themes => {
            console.log("INSTALLED THEMES COUNT:", themes.length)
        })
    }

    private createLinkButton(layout: Layout, customThemeDefinition: string = undefined) {
        if (layout === undefined) {
            return undefined;
        }
        if(layout.id === undefined){
            console.error("ID is undefined for layout",layout);
            return undefined;
        }
        if (layout.hideFromOverview) {
            const pref = State.state.osmConnection.GetPreference("hidden-theme-" + layout.id + "-enabled");
            this.ListenTo(pref);
            if (pref.data !== "true") {
                return undefined;
            }
        }
        if (layout.id === State.state.layoutToUse.data.id) {
            return undefined;
        }

        const currentLocation = State.state.locationControl.data;
        let linkText =
            `./${layout.id.toLowerCase()}.html?z=${currentLocation.zoom}&lat=${currentLocation.lat}&lon=${currentLocation.lon}`

        if (location.hostname === "localhost" || location.hostname === "127.0.0.1") {
            linkText = `./index.html?layout=${layout.id}&z=${currentLocation.zoom}&lat=${currentLocation.lat}&lon=${currentLocation.lon}`
        }

        if (customThemeDefinition) {
            linkText = `./index.html?userlayout=${layout.id}&z=${currentLocation.zoom}&lat=${currentLocation.lat}&lon=${currentLocation.lon}#${customThemeDefinition}`

        }

        let description = Translations.W(layout.description);
        if (description !== undefined) {
            description = new Combine(["<br/>", description]);
        }
        const link =
            new SubtleButton(layout.icon,
                new Combine([
                    "<b>",
                    Translations.W(layout.title),
                    "</b>",
                    description ?? "",
                ]), {url: linkText, newTab: false})
        return link;
    }

    InnerRender(): string {

        console.log("Inner rendering MORE")
        const tr = Translations.t.general.morescreen;

        const els: UIElement[] = []

        els.push(new VariableUiElement(
            State.state.osmConnection.userDetails.map(userDetails => {
                if (userDetails.csCount < State.userJourney.themeGeneratorReadOnlyUnlock) {
                    return tr.requestATheme.Render();
                }
                return new SubtleButton("./assets/pencil.svg", tr.createYourOwnTheme, {
                    url: "./customGenerator.html",
                    newTab: false
                }).Render();
            })
        ));


        for (const k in AllKnownLayouts.allSets) {
            const layout : Layout = AllKnownLayouts.allSets[k];
            if (k === PersonalLayout.NAME) {
                if (State.state.osmConnection.userDetails.data.csCount < State.userJourney.personalLayoutUnlock) {
                    continue;
                }
            }
            if (layout.id !== k) {
                continue; // This layout was added multiple time due to an uppercase
            }
            els.push(this.createLinkButton(layout));
        }


        const customThemesNames = State.state.installedThemes.data ?? [];
        if (customThemesNames.length > 0) {
            els.push(Translations.t.general.customThemeIntro)

            for (const installed of State.state.installedThemes.data) {
                els.push(this.createLinkButton(installed.layout, installed.definition));
            }
        }


        return new VerticalCombine([
            tr.intro,
            new VerticalCombine(els),
            tr.streetcomplete
        ]).Render();
    }

}