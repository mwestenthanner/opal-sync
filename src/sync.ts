import { FrontMatterCache, request, TFile } from "obsidian";
import type { Note } from "types";

const apiUrl = 'http://localhost:3000/api/notes/';
const noteFolder = 'Note folder';

export async function fetchNotes() {
	const notes = await getNotes();
	const existingNotes = getFilesInFolder(noteFolder, true);

	notes.forEach((note: Note) => {
		const title = note.title + '.md'
		const path = noteFolder + '/' + title;

		if (existingNotes.has(title)) {
			// if note exists, check if modified dates differ, then update
			const existingNoteData = readFrontmatter(path);
			if (existingNoteData?.lastModified && existingNoteData?.lastModified !== note.metadata.lastModified.toISOString()) {
				updateNote(note, path);
			}
		} else {
			// if note does not exist, create it
			createNote(note, path);
		}
	})	
}

export async function uploadNotes() {
	const notesInDb = await getNotes();
	const notes = getFilesInFolder(noteFolder, false) as Set<TFile>;
	
	notes.forEach(async (note) => {
		const fm = readFrontmatter(note.path);

		// if note has no id or id is not in db, upload, then write frontmatter
		if (!fm || !JSON.stringify(notesInDb).includes(fm.id)) {
			const res = await uploadNoteToDb(noteFolder, note.basename);
			if (!fm) {
				updateNote({
					title: note.basename,
					content: await readFile(note.path),
					metadata: { id: res._id, lastModified: res.lastModified }
				} as Note, note.path);
			}

			else {
				await app.fileManager.processFrontMatter(note, (fm) => {
					fm['lastModified'] = res.lastModified;
					fm['id'] = res._id
				})
			}
		} 

		// if id is found, compare content/title, then update if necessary
		else {
			const noteInDb = notesInDb.find((obj: Note) => { return obj.metadata.id === fm.id })
			const content = await getContentWithoutFrontmatter(note.path, fm);

			if (noteInDb.title !== note.basename || noteInDb.content !== content) {
				await updateNoteInDb(noteFolder, note.basename);
			}
		}
	});
}

async function getNotes() {
	const existingNotes = getFilesInFolder('Note folder', true) as Set<string>;
	const res = await request(apiUrl);
	return JSON.parse(res).map((item: { title: string; content: string; _id: string; lastModified: string; }) => {
		return { 
			title: item.title || getDefaultNoteTitle(item.content, existingNotes),
			content: item.content,
			metadata: {
				id: item._id,
				lastModified: new Date(item.lastModified)
			}
		}
	});
}

async function uploadNoteToDb(folder: string, title: string) {
	const note = await convertFileToNote(folder, title);

	const body = JSON.stringify({
		title: note.title,
		content: note.content,
		lastModified: new Date()
	});

	const headers = new Headers();
	headers.append('Content-Type', 'application/json');

	const response = await fetch(apiUrl, {
		method: 'POST',
		headers: headers,
		mode: 'cors',
		cache: 'default',
		body: body
	});

	return response.json();
}

async function updateNoteInDb(folder: string, title: string) {
	const note = await convertFileToNote(folder, title);

	const body = JSON.stringify({
		title: note.title,
		content: note.content,
		lastModified: new Date()
	});

	const headers = new Headers();
	headers.append('Content-Type', 'application/json');

	await fetch(apiUrl + note.metadata.id, {
		method: 'PUT',
		headers: headers,
		mode: 'cors',
		cache: 'default',
		body: body
	});
}

function getFilesInFolder(folder: string, filenameOnly: boolean) {
	const existingTitlesInFolder: Set<string | TFile> = new Set();
    app.vault.getMarkdownFiles().forEach((file: TFile) => {
      const fileInDir =
        folder === "/"
          ? !file.path.contains("/")
          : file.path.startsWith(folder);

		if (fileInDir && filenameOnly) existingTitlesInFolder.add(file.name)
		else if (fileInDir) existingTitlesInFolder.add(file)
    });
    return existingTitlesInFolder;
}

function getDefaultNoteTitle (
	content: string,
	existingTitles: Set<string>,
) {
	const titleFromContent = content
		.substring(0, 40)
		.replace(/[\n\r]/g, ' ')
		.replace(/([[\]#*:/\\^.])/g, "");

	if (titleFromContent.length === 0) {
		return 'Note';
	}

	let tempTitle = titleFromContent;
	let i = 1;
	while (existingTitles.has(`${tempTitle}.md`)) {
		tempTitle = `${titleFromContent} (${i})`;
		i++;
	}

	return `${tempTitle}.md`;
}

function readFrontmatter(path: string) {
	const file =  app.vault.getAbstractFileByPath(path) as TFile;
	return app.metadataCache.getFileCache(file)?.frontmatter;
}

async function readFile(path: string) {
	const file =  app.vault.getAbstractFileByPath(path) as TFile;
	return await app.vault.read(file);
}

function updateNote(note: Note, path: string) {
	const file = app.vault.getAbstractFileByPath(path) as TFile;
	const frontmatter = generateFrontmatter(note.metadata);
	app.vault.modify(file, frontmatter + note.content);
}

function createNote(note: Note, path: string) {
	const frontmatter = generateFrontmatter(note.metadata);
	app.vault.create(path, frontmatter + note.content);
}

async function convertFileToNote(folder: string, title: string) {
	const path = folder + '/' + title + '.md';
	const frontmatter = readFrontmatter(path);
	const content = await getContentWithoutFrontmatter(path, frontmatter);

	return {
		title: title,
		content: content,
		metadata: {
			id: frontmatter?.id || '',
			lastModified: frontmatter?.lastModified
		}
	} as Note;
}

function generateFrontmatter(data: Record<any, any>) {
	const str = Object.entries(data).map(([fieldName, value]) => `${fieldName}: ${parseFrontmatterValue(value)}`).join("\n")
	return "---\n" + str + "\n---\n"
}

async function getContentWithoutFrontmatter(path: string, frontmatter: FrontMatterCache | undefined) {
	const contentAll = await readFile(path);
	const lines = frontmatter ? frontmatter.position.end.line : 0;
	return contentAll.split("\n").slice(lines + 1).join("\n");
}

function parseFrontmatterValue(value: any) {
	if (value instanceof Date) {
		return value.toISOString();
	} else return value;
}


