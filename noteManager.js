class noteManager {
  /**
   * Creates a new, validated Note object.
   * This is the primary entry point for note creation.
   * @param {string} noteContent The main text of the note.
   * @param {string} noteTitle The title of the note.
   * @param {object} entityObject The object this note is attached to (e.g., an Invoice or Client instance).
   * @param {string} [user] The email of the user creating the note. Optional.
   * @returns {Note} The newly created Note object.
   */
  static newNote(noteContent, noteTitle, entityObject, user) {
    if (!noteContent || !noteTitle || !entityObject) {
      throw new Error(errorMessages('noteManager.newNote').EMPTY_OR_INVALID_NOTE.IT_TEXT);
    }
    if (typeof noteContent !== "string" || typeof noteTitle !== "string") {
      throw new Error(errorMessages('noteManager.newNote').INVALID_NOTE_ENTITY.IT_TEXT);
    }

    const originDetails = this._getOriginDetails(entityObject);

    const author = user || null;
    const date = new Date();
    
    const newNote = new Note(
      noteTitle,
      noteContent,
      author,
      originDetails.uuid,
      originDetails.origin,
      date
    );

    return newNote;
  }

  /**
   * (Internal Helper) Takes an entity object and returns its type and UUID.
   * @param {object} entityObject An instance of Invoice, Client, or Vendor.
   * @returns {{origin: string, uuid: string}}
   */
  static _getOriginDetails(entityObject) {
    if (entityObject instanceof Invoice) {
      return { origin: 'INVOICE', uuid: entityObject.uuid };
    }
    if (entityObject instanceof Client) {
      return { origin: 'CLIENT', uuid: entityObject.uuid };
    }
    if (entityObject instanceof Vendor) {
      return { origin: 'VENDOR', uuid: entityObject.uuid };
    }
    
    throw new Error("Unknown entity type provided to getOriginDetails.");
  }
}