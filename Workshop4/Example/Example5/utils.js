function collectMessages(reply) {
    const categories = ['danger', 'success', 'info']
    const messages = []

    for (const category of categories) {
      const msgs = reply.flash(category) || []
      for (const msg of msgs) {
        messages.push({ category, message: msg })
      }
    }

    return messages
}

module.exports = collectMessages