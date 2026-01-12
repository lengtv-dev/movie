export const M3u8ProxyV1 = async (request: Request) => {
  const reqUrl = new URL(request.url);

  const targetUrl = reqUrl.searchParams.get("url");
  if (!targetUrl) {
    return new Response("Missing url", { status: 400 });
  }

  const referer = reqUrl.searchParams.get("referer") || "https://doofree789.com";
  const originHdr = reqUrl.searchParams.get("origin") || "";
  const proxyAll = reqUrl.searchParams.get("all") === "yes";

  const upstream = await fetch(targetUrl, {
    headers: {
      Referer: referer,
      ...(originHdr && { Origin: originHdr }),
    },
  });

  const contentType = upstream.headers.get("content-type") || "";
  const isM3U8 =
    contentType.includes("mpegurl") ||
    targetUrl.includes(".m3u8");

  // ===================== M3U8 =====================
  if (isM3U8) {
    const body = await upstream.text();
    const baseUrl = new URL(targetUrl);

    const rewritten = body
      .split("\n")
      .map(line => {
        const l = line.trim();

        // comment / empty
        if (!l || l.startsWith("#")) return line;

        // resolve relative & special cases เช่น chunks.m3u8/8
        const resolvedUrl = new URL(l, baseUrl).toString();

        return `${reqUrl.origin}?url=${encodeURIComponent(resolvedUrl)}`
          + `&referer=${encodeURIComponent(referer)}`
          + (originHdr ? `&origin=${encodeURIComponent(originHdr)}` : "")
          + (proxyAll ? `&all=yes` : "");
      })
      .join("\n");

    return new Response(rewritten, {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Content-Type": "application/vnd.apple.mpegurl",
      },
    });
  }

  // ===================== SEGMENT (.ts / .aac / .key / m3u8/8) =====================
  return new Response(upstream.body, {
    status: upstream.status,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": contentType || "application/octet-stream",
    },
  });
};
