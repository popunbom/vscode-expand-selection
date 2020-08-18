import * as vscode from 'vscode';
import { Position, Selection, TextDocument, TextEditor } from 'vscode';

class CharacterPair {
	left: string;
	right: string;

	constructor(left: string, right: string) {
		this.left = left;
		this.right = right;
	}
}

const PARENTHESIS: Array<CharacterPair> = [
	new CharacterPair("<", ">"),
	new CharacterPair("\"", "\""),
	new CharacterPair("'", "'"),
	new CharacterPair("[", "]"),
	new CharacterPair("{", "}"),
	new CharacterPair("(", ")"),
];

enum TextDirection {
	LEFT, RIGHT
}

/**
 * Get position of nearest parenthesis from base 
 * 
 * @param document  TextDocument
 * @param base      Base position
 * @param direction search direction
 */
function getPositionOfNearestParen(
	document: TextDocument, base: Position, direction: TextDirection
): Position | null {
	const charAt =
		(document: TextDocument, position: Position): string =>
			document.lineAt(position.line).text.charAt(position.character);

	let offset = document.offsetAt(base);
	let position = document.positionAt(offset);
	let prevPosition = position;

	if (direction === TextDirection.LEFT) {

		if (position.isEqual(new Position(0, 0))) {
			return new Position(0, 0);
		}

		const LEFT_PARENTHESIS = PARENTHESIS.map(p => p.left);

		while (true) {
			position = document.positionAt(--offset);
			if (prevPosition.isEqual(position)) {
				break;
			}
			if (LEFT_PARENTHESIS.includes(charAt(document, position))) {
				return position.translate(0, 1);
			}
			prevPosition = position;
		}
	} else {
		const RIGHT_PARENTHESIS = PARENTHESIS.map(p => p.right);

		while (true) {
			if (RIGHT_PARENTHESIS.includes(charAt(document, position))) {
				return position;
			}
			position = document.positionAt(++offset);
			if (prevPosition.isEqual(position)) {
				break;
			}
			prevPosition = position;
		}
	}

	return null;
}

/**
 * Calculate Position considering TextDocument
 * 
 * @param document TextDocument
 * @param position Base position
 * @param offset   Offset from base position
 */
function positionWithOffset(document: TextDocument, position: Position, offset: number): Position {
	return document.positionAt(document.offsetAt(position) + offset);
}

/**
 * Get End-Of-File(EOF) position of TextDocument
 * 
 * @param document TextDocument
 */
function getEOFPosition(document: TextDocument): Position {
	const lineCount = document.lineCount - 1;
	return new Position(
		lineCount,
		document.lineAt(lineCount).text.length
	);
}

/**
 * Expand Selection - Main routine
 * 
 * @param editor TextEditor
 */
function expandSelection(editor: TextEditor) {
	const document = editor.document;
	const selection = editor.selection;

	const start = getPositionOfNearestParen(
		document,
		positionWithOffset(document, selection.start, -1),
		TextDirection.LEFT
	);
	const end = getPositionOfNearestParen(
		document,
		positionWithOffset(document, selection.end, 1),
		TextDirection.RIGHT
	);

	if (start !== null && end !== null) {
		editor.selection = new Selection(start, end);
	} else {
		editor.selection = new Selection(
			new Position(0, 0),
			getEOFPosition(document)
		);
	}
}

export function activate(context: vscode.ExtensionContext) {

	const disposable = vscode.commands.registerCommand(
		'vscode-expand-selection.expandSelection',
		() => {
			const editor = vscode.window.activeTextEditor;

			if (editor) {
				expandSelection(editor);
			}
		}
	);

	context.subscriptions.push(disposable);
}

export function deactivate() { }
