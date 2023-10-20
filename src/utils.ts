import { create } from "domain";
import { GeniusDOM } from "./types";

export function toQueryString(obj: Record<string, string>) {
    return Object.entries(obj).map(([key, val]) => `${key}=${encodeURIComponent(val)}`).join('&');
}

export function renderDOM(dom: GeniusDOM) {
    if (typeof dom == 'string') {
        return createEl('span', { text: dom });
    } else {
        const el = createEl(dom.tag == 'root' ? 'div' : dom.tag);
        const renderedChildren = dom.children?.map(child => renderDOM(child));
        if (renderedChildren)
            el.replaceChildren(...renderedChildren);
        return el;
    }
}