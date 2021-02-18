import { createServer as createHttpServer } from "http";
import { request, globalAgent } from "https";
import { createGzip, createGunzip } from "zlib";
import rootCas from "ssl-root-cas";

globalAgent.options.ca = rootCas.create();

export const createServer = (date) => {
	const minDate = new Date(date).getTime();
	const server = createHttpServer((req, res) => {
		const isInstallRequest =
			req.headers.accept &&
			req.headers.accept.includes("application/vnd.npm.install-v1+json");
		const remoteReq = request(
			`https://registry.yarnpkg.com${req.url}`,
			{
				headers: {
					...req.headers,
					host: "registry.yarnpkg.com",
					"accept-encoding": "gzip",
					accept: isInstallRequest
						? "application/json"
						: req.headers.accept || "",
				},
				method: req.method,
				rejectUnauthorized: false,
			},
			(remoteRes) => {
				for (const key of Object.keys(remoteRes.headers)) {
					if (
						key !== "content-length" &&
						(!isInstallRequest || key !== "content-type")
					)
						res.setHeader(key, remoteRes.headers[key]);
				}
				if (isInstallRequest) {
					res.setHeader("content-type", "application/vnd.npm.install-v1+json");
				}
				res.statusCode = remoteRes.statusCode;
				res.statusMessage = remoteRes.statusMessage;
				if (/^\/[^/]+$/.test(req.url) && remoteRes.statusCode === 200) {
					var bufs = [];
					if (remoteRes.headers["content-encoding"] === "gzip") {
						const unzipped = createGunzip();
						const zipped = createGzip();
						remoteRes = remoteRes.pipe(unzipped);
						zipped.pipe(res);
						res = zipped;
					}
					remoteRes.on("data", (d) => bufs.push(d));
					remoteRes.on("end", () => {
						const data = JSON.parse(Buffer.concat(bufs).toString("utf-8"));
						if (data.time) {
							const filteredVersions = new Set(
								Object.keys(data.time).filter(
									(key) =>
										key !== "modified" &&
										new Date(data.time[key]).getTime() > minDate
								)
							);
							for (const version of filteredVersions) {
								delete data.time[version];
								delete data.versions[version];
							}
							const makeVersionComparable = (v) =>
								v.replace(/\d+/g, (v) => `0000000000${v}`.slice(-10));
							const compareVersions = (a, b) =>
								makeVersionComparable(a) < makeVersionComparable(b) ? 1 : -1;
							for (const key of Object.keys(data["dist-tags"])) {
								if (filteredVersions.has(data["dist-tags"][key])) {
									if (key === "latest") {
										const old = data["dist-tags"].latest;
										data["dist-tags"].latest = Object.keys(data.versions)
											.filter((v) => !v.includes("-"))
											.sort(compareVersions)[0];
									} else {
										delete data["dist-tags"][key];
									}
								}
							}
						}
						const result = Buffer.from(
							JSON.stringify(
								isInstallRequest
									? {
											name: data.name,
											"dist-tags": data["dist-tags"],
											versions: data.versions,
											modified: data.time.modified,
									  }
									: data
							)
						);
						res.end(result);
					});
				} else {
					remoteRes.pipe(res);
				}
			}
		);
		req.pipe(remoteReq);
	});

	return new Promise((resolve) => {
		server.close();
		server.listen(3333, () =>
			resolve(
				() =>
					new Promise((resolve, reject) =>
						server.close((err) => (err ? reject(err) : resolve()))
					)
			)
		);
		server.unref();
	});
};
