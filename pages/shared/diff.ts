import { createPatch } from "diff";
import { Diff2HtmlUI } from "diff2html";
import { asWebGenComponent, HTMLComponent, lazy } from "webgen/mod.ts";

const lazyCss = lazy(() => fetch("https://esm.sh/diff2html/bundles/css/diff2html.min.css").then((res) => res.text()));

@asWebGenComponent("diff")
export class DiffComponent extends HTMLComponent {
    box: HTMLDivElement;
    diff: Diff2HtmlUI;

    constructor(diff: string) {
        super();
        this.box = document.createElement("div");
        this.diff = new Diff2HtmlUI(this.box, diff, {
            outputFormat: "side-by-side",
            // highlight: true,
            drawFileList: false,
            fileContentToggle: false,
            stickyFileHeaders: false,
            // @ts-ignore shit lib
            colorScheme: "dark",
        });
        this.diff.draw();

        this.shadowRoot!.append(this.box);
        lazyCss().then((css) => {
            const styleSheet = new CSSStyleSheet();
            styleSheet.replaceSync(css);
            this.shadowRoot!.adoptedStyleSheets = [...this.shadowRoot!.adoptedStyleSheets, styleSheet];
        });
    }
}

export function Diff(oldStr: string, newStr?: string) {
    if (!newStr) return new DiffComponent(oldStr).make();
    const diff = createPatch("Change", oldStr, newStr);
    return new DiffComponent(diff).make();
}
