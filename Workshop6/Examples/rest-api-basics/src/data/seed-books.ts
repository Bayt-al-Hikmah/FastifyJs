import type { Book } from '../types/book.js'


/**
 * Returns a fresh copy of the starter collection.
 *
 * A function (rather than a shared exported array) is used so the service can
 * rebuild the collection from scratch. This is the closest a database-free
 * example can get to a migration: restart the process and the library returns
 * to this exact state.
 */

export function createSeedBooks(): Book[] {

    return [
        {
            id: 1,
            title: 'The Pragmatic Programmer',
            author: 'Andrew Hunt and David Thomas',
            isbn: '978-0-201-61622-4',
            genre: 'Technology',
            publishedYear: 1999,
            copies: 4,
            available: true,
            description: 'A practical guide to thinking and working like a pragmatic programmer, from debugging habits to career ownership.'
        },
        {
            id: 2,
            title: 'Clean Code',
            author: 'Robert C. Martin',
            isbn: '978-0-13-235088-4',
            genre: 'Technology',
            publishedYear: 2008,
            copies: 2,
            available: false,
            description: 'A handbook of readable, maintainable code with concrete advice on naming, functions, comments, and tests.'
        },
        {
            id: 3,
            title: 'Dune',
            author: 'Frank Herbert',
            isbn: '978-0-441-17271-9',
            genre: 'Fiction',
            publishedYear: 1965,
            copies: 3,
            available: true,
            description: 'A landmark science-fiction novel about power, ecology, and prophecy on the desert planet Arrakis.'
        },
        {
            id: 4,
            title: 'The Hobbit',
            author: 'J. R. R. Tolkien',
            isbn: '978-0-261-10235-6',
            genre: 'Fiction',
            publishedYear: 1937,
            copies: 5,
            available: true,
            description: 'Bilbo Baggins joins a company of dwarves on an unexpected journey that changes the shape of Middle-earth.'
        },
        {
            id: 5,
            title: 'A Short History of Nearly Everything',
            author: 'Bill Bryson',
            isbn: '978-0-385-66004-5',
            genre: 'Science',
            publishedYear: 2003,
            copies: 2,
            available: true,
            description: 'An accessible tour of the sciences, from the Big Bang to the microbes sharing our bodies.'
        },
        {
            id: 6,
            title: 'Sapiens: A Brief History of Humankind',
            author: 'Yuval Noah Harari',
            isbn: '978-0-06-231609-7',
            genre: 'History',
            publishedYear: 2011,
            copies: 3,
            available: true,
            description: 'A sweeping account of how Homo sapiens came to dominate the planet through shared stories and collective belief.'
        },
        {
            id: 7,
            title: 'Educated',
            author: 'Tara Westover',
            isbn: '978-0-399-95932-6',
            genre: 'Biography',
            publishedYear: 2018,
            copies: 2,
            available: true,
            description: 'A memoir about growing up in an isolated family and discovering the transforming power of formal education.'
        },
        {
            id: 8,
            title: 'The Immortal Life of Henrietta Lacks',
            author: 'Rebecca Skloot',
            isbn: '978-1-4000-5217-1',
            genre: 'Biography',
            publishedYear: 2010,
            copies: 1,
            available: false,
            description: 'The story of the cells taken from Henrietta Lacks and the ethical questions their use raised for her family.'
        },
        {
            id: 9,
            title: 'Selected Poems',
            author: 'Maya Angelou',
            isbn: '978-0-679-73293-2',
            genre: 'Poetry',
            publishedYear: 1994,
            copies: 4,
            available: true,
            description: 'A collection of poems celebrating resilience, identity, and the strength of community.'
        }
    ]

}
