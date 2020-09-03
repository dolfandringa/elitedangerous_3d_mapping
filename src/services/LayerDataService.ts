import { JSONPCDLayer, Layer, EDSMLayer } from "../types";

export class LayerDataService {

    static getLayer(layer: Layer): string {
        if (layer instanceof JSONPCDLayer) {
            return LayerDataService.getJSONPCDLayer(layer);
        }
        else if (layer instanceof EDSMLayer) {
            return LayerDataService.getEDSMLayer(layer);
        }
        return "invalid";

    }

    static getJSONPCDLayer(layer: JSONPCDLayer): string {
        return "JSONPCD";

    }

    static getEDSMLayer(layer: EDSMLayer): string {
        return "EDSM";
    }
}