class Abstract {
    async handle(request) {
        throw 'Handler not implemented';
    }
}

module.exports = Abstract;
