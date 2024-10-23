import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
	const itemCategory = await prisma.itemCategory.createMany({
		data: [
			{
				name: "Ready to eat",
			},
			{
				name: "Condiment",
			},
			{
				name: "Drinks",
			},
			{
				name: "Can food",
			},
			{
				name: "Raw item",
			},
			{
				name: "Dry food",
			},
		],
	});

	console.log(itemCategory);
}

main()
	.then(async () => {
		await prisma.$disconnect();
	})
	.catch(async (e) => {
		console.error(e);
		await prisma.$disconnect();
		process.exit(1);
	});
