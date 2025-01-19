import prisma from "../services/client";

export default class Item {
	async filterItem({
		name,
		email,
		categoryId,
		take,
	}: {
		name?: string | undefined;
		email?: string;
		categoryId?: number;
		take?: number;
	}) {
		return await prisma.item.findMany({
			include: {
				user: {
					select: {
						email: true,
						name: true,
						avatar: true,
					},
				},
			},

			where: {
				OR: [
					{
						name: {
							contains: name,
						},
					},
					categoryId
						? {
								category_id: categoryId,
						  }
						: {},
					{
						available: true,
						email: {
							not: email,
						},
					},
				],
			},

			orderBy: {
				timestamp: "desc",
			},
			take: take,
		});
	}
}
