
![github.png](/packages/branding/src/platforms/github_social_preview.png)

# <h1 align="center">Bondery</h1>
<p align="center">
    Your open-source network manager
</p>

## 🟣 What's Bondery?

Bondery helps you manage your network of contacts effortlessly. Whether you're looking to keep in touch with friends, family, or professional connections, Bondery provides the tools you need to stay organized and connected.

Start building meaningful relationships today with [Bondery](https://usebondery.com)!

## � Quick Start

**New to the project?** Check out [SETUP.md](./SETUP.md) for detailed setup instructions.

```bash
# Install dependencies
pnpm install

# Build shared packages
pnpm build --filter=@bondery/types --filter=@bondery/branding

# Run all apps in development
pnpm dev
```

Apps will be available at:
- Website: http://localhost:3000
- Server API: http://localhost:3001
- Webapp: http://localhost:3002

## 📐 Architecture

Bondery is split into multiple deployable units:
- **apps/website** - Public landing page
- **apps/webapp** - Authenticated application
- **apps/server** - Fastify REST API
- **packages/types** - Shared TypeScript types

See [ARCHITECTURE.md](./ARCHITECTURE.md) for detailed architecture documentation.

## �🛠️ Contributing
You are welcome to contribute to Bondery! Please read our [Contributing Guide](CONTRIBUTING) for details on how to get started.

## 📝 License
Bondery is open-source software licensed under the [AGPL-3.0 license](LICENSE).

## 📧 Get in touch with us
If you have any questions, feedback, or need support, feel free to reach out to us at our page: [https://bondery.com](https://bondery.com).

If you encounter any issues or have feature requests, please open an issue on our [GitHub repository](https://github.com/sveetya/bondery).