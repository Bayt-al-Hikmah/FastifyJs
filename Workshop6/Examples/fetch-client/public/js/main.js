import {
    loadNotes,
    loadTopics,
    saveNoteFromForm,
    uploadSelectedImage,
    resetEditor
} from './notes.js'


/**
 * Wiring only. The modules above own the API calls and the rendering; this
 * file connects DOM events to those exported functions and starts the app.
 */

const filterForm = document.querySelector('#filter-form')

const searchInput = document.querySelector('#search-input')

const topicFilter = document.querySelector('#topic-filter')

const noteForm = document.querySelector('#note-form')

const uploadForm = document.querySelector('#upload-form')

const newNoteButton = document.querySelector('#new-note-button')

const resetButton = document.querySelector('#reset-button')

const titleInput = document.querySelector('#title-input')

const editorPanel = document.querySelector('.editor-panel')


let searchTimer = null


filterForm.addEventListener('submit', (event) => {

    event.preventDefault()

    loadNotes()

})


// Debounce typing so we do not fire a request for every keystroke.

searchInput.addEventListener('input', () => {

    clearTimeout(searchTimer)

    searchTimer = setTimeout(() => {

        loadNotes()

    }, 250)

})


topicFilter.addEventListener('change', () => {

    loadNotes()

})


noteForm.addEventListener('submit', (event) => {

    event.preventDefault()

    saveNoteFromForm()

})


uploadForm.addEventListener('submit', (event) => {

    event.preventDefault()

    uploadSelectedImage()

})


newNoteButton.addEventListener('click', () => {

    resetEditor()

    editorPanel.scrollIntoView({
        behavior: 'smooth',
        block: 'nearest'
    })

    titleInput.focus()

})


resetButton.addEventListener('click', () => {

    resetEditor()

    titleInput.focus()

})


async function startApplication() {

    await loadTopics()

    await loadNotes()

}


startApplication()
