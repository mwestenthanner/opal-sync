export interface Note {
	title: string,
	content: string, 
	metadata: {
		id: string,
		lastModified: Date
	}
}
