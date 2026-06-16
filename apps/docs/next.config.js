/** @type {import('next').NextConfig} */
const nextConfig = {
    output: "standalone",
    basePath: "/docs",
    async redirects() {
        return [
            {
                source: "/",
                destination: "/docs",
                permanent: false,
                basePath: false,
            },
        ];
    },
};

export default nextConfig;
