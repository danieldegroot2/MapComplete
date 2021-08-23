import {FixedUiElement} from "./UI/Base/FixedUiElement";
import {VariableUiElement} from "./UI/Base/VariableUIElement";
import Hash from "./Logic/Web/Hash";
import {InitUiElements} from "./InitUiElements";
import {Utils} from "./Utils";
import {UIEventSource} from "./Logic/UIEventSource";
import {LocalStorageSource} from "./Logic/Web/LocalStorageSource";
import LZString from "lz-string";
import {LayoutConfigJson} from "./Models/ThemeConfig/Json/LayoutConfigJson";
import Combine from "./UI/Base/Combine";


new VariableUiElement(Hash.hash.map(
    hash => {
        let json: {};
        try {
            json = atob(hash);
        } catch (e) {
            // We try to decode with lz-string
            json =
                Utils.UnMinify(LZString.decompressFromBase64(hash))
        }
        return new Combine([
            new FixedUiElement("Base64 decoded: " + atob(hash)),
            new FixedUiElement("LZ: " + LZString.decompressFromBase64(hash)),
            new FixedUiElement("Base64 + unminify: " + Utils.UnMinify(atob(hash))),
            new FixedUiElement("LZ + unminify: " + Utils.UnMinify(LZString.decompressFromBase64(hash)))
        ]).SetClass("flex flex-col m-1")
    }
))
    .AttachTo("maindiv")