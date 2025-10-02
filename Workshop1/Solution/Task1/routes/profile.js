module.exports = async (fastify, opts) => {
    const profiles = {
  Alice: { username: "Alice", email: "alice@example.com", role: "admin" },
  Bob: { username: "Bob", email: "bob@example.com", role: "user" },
  Carol: { username: "Carol", email: "carol@example.com", role: "moderator" },
  Dave: { username: "Dave", email: "dave@example.com", role: "user" },
};

    fastify.get('/profile/:username', async (request, reply) => {
    const { username } = request.params
    const { details } = request.query 

    const profile = profiles[username];
    if (!profile) {
      return reply.status(404).send({ error: "User not found" });
    }
    if (details !== 'true') {
      return { username: profile.username };
    }

    return profile;
    })
}