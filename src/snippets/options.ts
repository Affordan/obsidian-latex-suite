import { EditorView } from "@codemirror/view";

import { isInsideEnvironment, isWithinEquation, isWithinInlineEquation, langIfWithinCodeblock } from "src/editor_helpers";

export class Options {
	mode!: Mode;
	automatic: boolean;
	regex: boolean;
	onWordBoundary: boolean;

	constructor() {
		this.mode = new Mode();
		this.automatic = false;
		this.regex = false;
		this.onWordBoundary = false;
	}
}

export function parseOptions(source: string):Options {
	let options = new Options();
	options.mode = parseMode(source);

	for (const flag_char of source) {
		switch (flag_char) {
			case "A":
				options.automatic = true;
				break;
			case "r":
				options.regex = true;
				break;
			case "w":
				options.onWordBoundary = true;
				break;
		}
	}

	return options;
}

export class Mode {
	text!: boolean;
	inlineMath!: boolean;
	blockMath!: boolean;
	code!: boolean;

	anyMath():boolean {
		return this.inlineMath || this.blockMath;
	}

	constructor() {
		this.text = false;
		this.blockMath = false;
		this.inlineMath = false;
		this.code = false;
	}

	invert() {
		this.text = !this.text;
		this.blockMath = !this.blockMath;
		this.inlineMath = !this.inlineMath;
		this.code = !this.code;
	}

	overlaps(other: Mode):boolean {
		return (this.text && other.text)
			|| (this.blockMath && other.blockMath)
			|| (this.inlineMath && other.blockMath)
			|| (this.code && other.code);
	}
}

export function modeAtViewPos(view: EditorView, pos: number):Mode {
	let mode = new Mode();

	const codeLanguage = langIfWithinCodeblock(view);
	const inCode = codeLanguage !== null;
	const ignoreMath = inCode && ["bash", "php", "perl", "julia", "sh"].contains(codeLanguage);

	let inMath = !ignoreMath
		&& isWithinEquation(view.state)
		&& !(
			isInsideEnvironment(view, pos, {openSymbol: "\\text{", closeSymbol: "}"})
			|| isInsideEnvironment(view, pos, {openSymbol: "\\tag{", closeSymbol: "}"})
		);
	const inInlineEquation = isWithinInlineEquation(view.state);

	mode.text = !inCode && !inMath;
	mode.blockMath = inMath && !inInlineEquation;
	mode.inlineMath = inMath && inInlineEquation;
	mode.code = inCode;

	return mode;
}

export function parseMode(source: string):Mode {
	let mode = new Mode();

	if (source.length === 0) {
		// for backwards compat we need to assume that this is a catchall mode then
		mode.invert();
		return mode;
	}

	for (const flag_char of source) {
		switch (flag_char) {
			case "m":
				mode.blockMath = true;
				mode.inlineMath = true;
				break;
			case "k":
				mode.inlineMath = true;
				break;
			case "M":
				mode.blockMath = true;
				break;
			case "t":
				mode.text = true;
				break;
			case "c":
				mode.code = true;
				break;
		}
	}

	return mode;
}
