const env = process.env;

const config = {
 	listPerPage: env.LIST_PER_PAGE || 10,
	default_port: 3000
}

module.exports = config;