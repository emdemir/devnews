# DevNews

A technology-focused community website for shating interesting news online.

## Dependencies

The system is fully Dockerized so there isn't any build-time dependency.

## The stack

DevNews is comprised of a Node.js Koa application. It contains two "apps", one
for the web interface and one for the REST API. Dependency injection is used
to make testing easier (there are no tests yet, however). Sessions are stored
in Redis. The backend database is PostgreSQL.

## Running

Simply clone the repository. Afterwards, you need to either generate
certificates for the Nginx container, or add your own. To generate self-signed
certificates for development, run in the `nginx/` directory:

- `openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365`

Finally, in the project root run:

- `docker-compose build`
- `docker-compose up`

The nginx server will be listening on port 8080 for HTTP and port 8443 for
HTTPS. The database will be seeded with the user `admin` (password `admin`) and
some test stories and tags, which you can then modify as you wish.

## Copyright

&copy; 2020 Efe Mert Demir. This software is licensed under the GNU General
Public License, version 3.
