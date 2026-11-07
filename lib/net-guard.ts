// SSRF protection: treats as private/local loopback, private networks,
// link-local (cloud metadata 169.254.169.254), CGNAT, multicast and IPv6 equivalents.
export function isBlockedIp(addr: string): boolean {
	let ip = addr;
	// IPv4-mapped IPv6 (::ffff:1.2.3.4) → take the embedded IPv4
	const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/i);
	if (mapped) ip = mapped[1];

	if (ip.includes(".")) {
		const p = ip.split(".").map(Number);
		if (p.length !== 4 || p.some((n) => Number.isNaN(n) || n < 0 || n > 255)) return true;
		const [a, b] = p;
		if (a === 0 || a === 127) return true; // 0.0.0.0/8, loopback
		if (a === 10) return true; // 10.0.0.0/8
		if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
		if (a === 192 && b === 168) return true; // 192.168.0.0/16
		if (a === 169 && b === 254) return true; // link-local / cloud metadata
		if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
		if (a >= 224) return true; // multicast/reserved
		return false;
	}

	// IPv6
	const v = ip.toLowerCase();
	if (v === "::" || v === "::1") return true; // unspecified, loopback
	if (v.startsWith("fe80")) return true; // link-local
	if (v.startsWith("fc") || v.startsWith("fd")) return true; // ULA fc00::/7
	return false;
}
