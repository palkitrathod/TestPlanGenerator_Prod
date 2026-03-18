const app = require('./server');
const listEndpoints = (app) => {
    const endpoints = [];
    app._router.stack.forEach((middleware) => {
        if (middleware.route) {
            endpoints.push({
                path: middleware.route.path,
                methods: Object.keys(middleware.route.methods)
            });
        } else if (middleware.name === 'router') {
            middleware.handle.stack.forEach((handler) => {
                if (handler.route) {
                    endpoints.push({
                        path: handler.route.path,
                        methods: Object.keys(handler.route.methods)
                    });
                }
            });
        }
    });
    return endpoints;
};

console.log(JSON.stringify(listEndpoints(app), null, 2));
