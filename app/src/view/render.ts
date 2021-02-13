// I tried to setup koa-views but it's a trashfire of a library.

import Koa = require("koa");
import nunjucks = require("nunjucks");

// The context function for rendering stuff.
export type NunjucksContext = {
    render(name: string): Promise<string>;
    render(name: string, context: { [name: string]: any }): Promise<string>;
    addGlobal(name: string, value: any): void;
};

const nunjucksMiddleware = (
    path: string,
    opts?: nunjucks.ConfigureOptions,
    globals?: { [name: string]: any }
): Koa.Middleware<{}, NunjucksContext> => {
    const njk = nunjucks.configure(path, opts);
    if (globals) {
        Object.entries(globals).forEach(([name, value]) => njk.addGlobal(name, value));
    }

    return async function nunjucks(ctx, next) {
        ctx.render = (name: string, context?: { [name: string]: any }) =>
            new Promise<string>((resolve, reject) => {
                njk.render(name, context, (err, template) => {
                    if (err) {
                        reject(err);
                    } else {
                        ctx.body = template;
                        resolve(template!);
                    }
                });
            });

        await next();
    };
}

export default nunjucksMiddleware;
