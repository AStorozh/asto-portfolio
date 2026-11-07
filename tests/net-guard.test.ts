import { describe, expect, it } from "vitest";
import { isBlockedIp } from "@/lib/net-guard";

describe("isBlockedIp (SSRF guard for the assistant's fetch_url tool)", () => {
	it.each([
		"127.0.0.1",
		"0.0.0.0",
		"10.1.2.3",
		"172.16.0.1",
		"172.31.255.255",
		"192.168.1.1",
		"169.254.169.254", // cloud metadata
		"100.64.0.1", // CGNAT
		"224.0.0.1", // multicast
		"::1",
		"::",
		"fe80::1",
		"fd00::1",
		"::ffff:127.0.0.1", // IPv4-mapped loopback
		"999.1.1.1", // malformed
	])("blocks %s", (ip) => {
		expect(isBlockedIp(ip)).toBe(true);
	});

	it.each(["8.8.8.8", "1.1.1.1", "172.32.0.1", "100.128.0.1", "2606:4700:4700::1111", "::ffff:8.8.8.8"])(
		"allows public %s",
		(ip) => {
			expect(isBlockedIp(ip)).toBe(false);
		},
	);
});
