module.exports = async (fastify, opts) => {
    const booksDb = {
    '201': { id: '201', title: 'Clean Code', author: 'Robert C. Martin', price: 35 },
    '202': { id: '202', title: 'The Pragmatic Programmer', author: 'Andrew Hunt', price: 45 },
    '203': { id: '203', title: 'Design Patterns', author: 'Erich Gamma', price: 55 }
    }

    fastify.get('/books/:bookId', async (request, reply) => {
    const { bookId } = request.params
    const { summary } = request.query 

    if (summary == "true") {
        try{
            const { title, author } = booksDb[bookId];
            const book = { title, author };
            return book;
        }catch(err){
            reply.code(404).send({ error: 'Book not found' })
            return
        }
    }else{
        return booksDb[bookId] || { error: 'Book not found'}
    }
    })
}