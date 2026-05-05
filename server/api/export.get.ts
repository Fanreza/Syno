import PDFDocument from "pdfkit";

const KNOWN_MINTS: Record<string, string> = {
	So11111111111111111111111111111111111111112: "SOL",
	EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: "USDC",
	Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: "USDT",
};

function tokenLabel(mint: string) {
	return KNOWN_MINTS[mint] ?? (mint.length > 8 ? mint.slice(0, 6) + "…" : mint);
}

function fmtDate(iso: string) {
	if (!iso) return "";
	return new Date(iso).toISOString().slice(0, 10);
}

function fmtNum(n: number) {
	if (!n) return "0";
	return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 9 });
}

type TxRow = {
	date: string;
	type: string;
	direction: "Sent" | "Received";
	amount: string;
	token: string;
	counterparty: string;
	memo: string;
	tx_signature: string;
};

async function collectRows(userId: string, db: any, from: string, to: string): Promise<TxRow[]> {
	const rows: TxRow[] = [];

	function dateFilter(q: any, field = "created_at") {
		if (from) q = q.gte(field, from);
		if (to) q = q.lte(field, to + "T23:59:59Z");
		return q;
	}

	// Payments sent (not split payments)
	{
		let q = db
			.from("payments")
			.select("amount, token, memo, tx_signature, created_at, receiver_address, users!payments_receiver_id_fkey(username)")
			.eq("sender_id", userId)
			.is("split_participant_id", null)
			.order("created_at", { ascending: false });
		q = dateFilter(q);
		const { data } = await q;
		for (const p of data ?? []) {
			const to_user = (p as any).users?.username ?? p.receiver_address ?? "unknown";
			rows.push({
				date: fmtDate(p.created_at),
				type: "Payment",
				direction: "Sent",
				amount: fmtNum(Number(p.amount)),
				token: tokenLabel(p.token),
				counterparty: `@${to_user}`,
				memo: p.memo ?? "",
				tx_signature: p.tx_signature ?? "",
			});
		}
	}

	// Payments received (not split payments)
	{
		let q = db
			.from("payments")
			.select("amount, token, memo, tx_signature, created_at, users!payments_sender_id_fkey(username)")
			.eq("receiver_id", userId)
			.is("split_participant_id", null)
			.order("created_at", { ascending: false });
		q = dateFilter(q);
		const { data } = await q;
		for (const p of data ?? []) {
			const from_user = (p as any).users?.username ?? "unknown";
			rows.push({
				date: fmtDate(p.created_at),
				type: "Payment",
				direction: "Received",
				amount: fmtNum(Number(p.amount)),
				token: tokenLabel(p.token),
				counterparty: `@${from_user}`,
				memo: p.memo ?? "",
				tx_signature: p.tx_signature ?? "",
			});
		}
	}

	// Split payments made (as participant)
	{
		let q = db
			.from("split_participants")
			.select("amount, tx_signature, paid_at, split_bills(title, token, users!split_bills_creator_id_fkey(username))")
			.eq("user_id", userId)
			.eq("status", "paid")
			.order("paid_at", { ascending: false });
		if (from) q = q.gte("paid_at", from);
		if (to) q = q.lte("paid_at", to + "T23:59:59Z");
		const { data } = await q;
		for (const p of data ?? []) {
			const bill = (p as any).split_bills;
			rows.push({
				date: fmtDate(p.paid_at ?? ""),
				type: "Split",
				direction: "Sent",
				amount: fmtNum(Number(p.amount)),
				token: tokenLabel(bill?.token ?? "SOL"),
				counterparty: `@${bill?.users?.username ?? "unknown"}`,
				memo: bill?.title ?? "",
				tx_signature: p.tx_signature ?? "",
			});
		}
	}

	// Split payments received (as bill creator)
	{
		let q = db
			.from("split_participants")
			.select("amount, tx_signature, paid_at, users(username), split_bills!inner(title, token, creator_id)")
			.eq("split_bills.creator_id", userId)
			.eq("status", "paid")
			.order("paid_at", { ascending: false });
		if (from) q = q.gte("paid_at", from);
		if (to) q = q.lte("paid_at", to + "T23:59:59Z");
		const { data } = await q;
		for (const p of data ?? []) {
			const bill = (p as any).split_bills;
			rows.push({
				date: fmtDate(p.paid_at ?? ""),
				type: "Split",
				direction: "Received",
				amount: fmtNum(Number(p.amount)),
				token: tokenLabel(bill?.token ?? "SOL"),
				counterparty: `@${(p as any).users?.username ?? "unknown"}`,
				memo: bill?.title ?? "",
				tx_signature: p.tx_signature ?? "",
			});
		}
	}

	// Gift claims (received)
	{
		let q = db
			.from("gift_claims")
			.select("amount, tx_signature, created_at, gifts(token, users!gifts_creator_id_fkey(username))")
			.eq("user_id", userId)
			.order("created_at", { ascending: false });
		q = dateFilter(q);
		const { data } = await q;
		for (const c of data ?? []) {
			const gift = (c as any).gifts;
			rows.push({
				date: fmtDate(c.created_at),
				type: "Gift",
				direction: "Received",
				amount: fmtNum(Number(c.amount)),
				token: tokenLabel(gift?.token ?? "SOL"),
				counterparty: `@${gift?.users?.username ?? "unknown"}`,
				memo: "Gift received",
				tx_signature: c.tx_signature ?? "",
			});
		}
	}

	// Gifts sent (created)
	{
		let q = db
			.from("gifts")
			.select("total_amount, token, created_at, claimed_count, total_slots")
			.eq("creator_id", userId)
			.order("created_at", { ascending: false });
		q = dateFilter(q);
		const { data } = await q;
		for (const g of data ?? []) {
			rows.push({
				date: fmtDate(g.created_at),
				type: "Gift",
				direction: "Sent",
				amount: fmtNum(Number(g.total_amount)),
				token: tokenLabel(g.token),
				counterparty: `${g.claimed_count}/${g.total_slots} claimed`,
				memo: "Gift envelope",
				tx_signature: "",
			});
		}
	}

	rows.sort((a, b) => (a.date < b.date ? 1 : -1));
	return rows;
}

function buildCsv(rows: TxRow[], username: string, from: string, to: string): string {
	const header = ["Date", "Type", "Direction", "Amount", "Token", "Counterparty", "Memo", "TX Signature"];
	const csvRows = [
		`# Syno Tax Export — @${username}`,
		`# Period: ${from || "all"} to ${to || "all"}`,
		`# Generated: ${new Date().toISOString().slice(0, 10)}`,
		"",
		header.join(","),
		...rows.map((r) =>
			[r.date, r.type, r.direction, r.amount, r.token, r.counterparty, `"${r.memo.replace(/"/g, '""')}"`, r.tx_signature].join(",")
		),
	];
	return csvRows.join("\r\n");
}

async function buildPdf(rows: TxRow[], username: string, from: string, to: string): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const doc = new PDFDocument({ margin: 32, size: "A4", layout: "landscape" });
		const chunks: Buffer[] = [];
		doc.on("data", (c: Buffer) => chunks.push(c));
		doc.on("end", () => resolve(Buffer.concat(chunks)));
		doc.on("error", reject);

		const W = doc.page.width - 64; // usable width

		// Header
		doc.fontSize(20).font("Helvetica-Bold").text("Syno — Tax Export Report", 32, 32);
		doc.fontSize(10).font("Helvetica").fillColor("#6b7280");
		doc.text(`@${username}`, 32, 58);
		const dateLabel = from && to ? `${from} to ${to}` : from ? `From ${from}` : to ? `Up to ${to}` : "All time";
		doc.text(`Period: ${dateLabel}`);
		doc.text(`Generated: ${new Date().toISOString().slice(0, 10)}`);
		doc.moveDown(0.5);

		// Divider
		const y0 = doc.y;
		doc.moveTo(32, y0).lineTo(32 + W, y0).strokeColor("#e5e7eb").stroke();
		doc.moveDown(0.5);

		if (rows.length === 0) {
			doc.fontSize(12).fillColor("#374151").text("No transactions found for this period.", 32, doc.y + 16);
			doc.end();
			return;
		}

		// Column layout (landscape A4 = ~842pt wide, usable ~778pt)
		const cols = [
			{ label: "Date", width: 72 },
			{ label: "Type", width: 60 },
			{ label: "Direction", width: 62 },
			{ label: "Amount", width: 90 },
			{ label: "Token", width: 44 },
			{ label: "Counterparty", width: 110 },
			{ label: "Memo", width: 160 },
			{ label: "TX Signature", width: 120 },
		];

		function drawRow(r: TxRow | null, y: number, isHeader: boolean) {
			let x = 32;
			if (isHeader) {
				doc.rect(32, y - 4, W, 18).fill("#f3f4f6").fillColor("#111827");
				doc.fontSize(8).font("Helvetica-Bold").fillColor("#111827");
				for (const col of cols) {
					doc.text(col.label, x + 3, y, { width: col.width - 6, ellipsis: true });
					x += col.width;
				}
			} else if (r) {
				doc.fontSize(7.5).font("Helvetica").fillColor(r.direction === "Received" ? "#16a34a" : "#374151");
				x = 32;
				const cells = [r.date, r.type, r.direction, r.amount, r.token, r.counterparty, r.memo, r.tx_signature ? r.tx_signature.slice(0, 20) + "…" : ""];
				for (let i = 0; i < cols.length; i++) {
					const col = cols[i]!;
					const cell = cells[i] ?? "";
					// Amount right-aligned
					if (i === 3) {
						doc.fillColor(r.direction === "Received" ? "#16a34a" : "#1f2937");
						doc.text(cell, x + 3, y, { width: col.width - 6, align: "right", ellipsis: true });
					} else {
						doc.fillColor(i === 2 ? (r.direction === "Received" ? "#16a34a" : "#dc2626") : "#374151");
						doc.text(cell, x + 3, y, { width: col.width - 6, ellipsis: true });
					}
					x += col.width;
				}
			}
		}

		const rowH = 16;
		const headerH = 18;
		let y = doc.y + 4;

		drawRow(null, y, true);
		y += headerH;

		for (let i = 0; i < rows.length; i++) {
			// Stripe
			if (i % 2 === 0) {
				doc.rect(32, y - 2, W, rowH).fill("#f9fafb");
			}
			// Page break
			if (y + rowH > doc.page.height - 48) {
				doc.addPage();
				y = 32;
				drawRow(null, y, true);
				y += headerH;
			}
			drawRow(rows[i] ?? null, y, false);
			y += rowH;

			// Light horizontal line
			doc.moveTo(32, y - 2).lineTo(32 + W, y - 2).strokeColor("#f3f4f6").lineWidth(0.5).stroke();
		}

		// Footer
		const footerY = doc.page.height - 32;
		doc.fontSize(7).font("Helvetica").fillColor("#9ca3af");
		doc.text(`Total: ${rows.length} transactions`, 32, footerY, { width: W, align: "left" });
		doc.text("syno.app", 32, footerY, { width: W, align: "right" });

		doc.end();
	});
}

export default defineEventHandler(async (event) => {
	const auth = await requireUser(event);
	const query = getQuery(event);
	const format = (query.format as string) ?? "csv";
	const from = (query.from as string) ?? "";
	const to = (query.to as string) ?? "";

	const db = adminDb();
	const { data: me } = await db.from("users").select("id, username").eq("privy_user_id", auth.userId).single();
	if (!me) throw createError({ statusCode: 400, statusMessage: "User not found" });

	const rows = await collectRows(me.id, db, from, to);

	const slug = `${from || "all"}_${to || "all"}`;

	if (format === "pdf") {
		const pdf = await buildPdf(rows, me.username, from, to);
		setHeader(event, "Content-Type", "application/pdf");
		setHeader(event, "Content-Disposition", `attachment; filename="syno-tax-export-${slug}.pdf"`);
		return pdf;
	}

	// Default: CSV
	const csv = buildCsv(rows, me.username, from, to);
	setHeader(event, "Content-Type", "text/csv");
	setHeader(event, "Content-Disposition", `attachment; filename="syno-tax-export-${slug}.csv"`);
	return csv;
});
