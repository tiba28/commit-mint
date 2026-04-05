import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const users = await prisma.user.findMany();
        let resetCount = 0;

        for (const user of users) {
            const successfulTask = await prisma.taskResult.findFirst({
                where: {
                    goal: { userId: user.id },
                    isSuccess: true,
                    evaluatedAt: { gte: yesterday }
                }
            });

            if (!successfulTask) {
                await prisma.user.update({
                    where: { id: user.id },
                    data: { currentStreak: 0 }
                });
                resetCount++;
            }
        }

        return NextResponse.json({ success: true, resetCount });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}