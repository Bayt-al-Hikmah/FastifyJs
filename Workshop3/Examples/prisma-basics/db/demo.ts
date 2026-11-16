import { prisma } from './prisma.js'

async function main(): Promise<void> {
    console.log('Prisma basics demo')
    console.log('==================\n')

    // 1. Create a user together with nested projects and tasks.
    const uniqueEmail = `demo-${Date.now()}@example.com`

    const user = await prisma.user.create({
        data: {
            email: uniqueEmail,
            name: 'Ada Lovelace',
            projects: {
                create: [
                    {
                        name: 'Analytical Engine Notes',
                        tasks: {
                            create: [
                                { title: 'Draft the introduction' },
                                { title: 'Document the Bernoulli algorithm', completed: true }
                            ]
                        }
                    },
                    {
                        name: 'Programming Notes',
                        tasks: {
                            create: [
                                { title: 'Collect examples' },
                                { title: 'Annotate the examples' }
                            ]
                        }
                    }
                ]
            }
        },
        include: {
            projects: {
                include: {
                    tasks: true
                }
            }
        }
    })

    const projectIds = user.projects.map((project) => project.id)

    console.log('Created user:', user.name)
    console.log('Email:', user.email)
    console.log('Projects:', user.projects.length)

    for (const project of user.projects) {
        console.log(`  - ${project.name} (${project.tasks.length} tasks)`)
    }

    // 2. Load one project with its owner and tasks using include().
    const project = await prisma.project.findFirstOrThrow({
        where: {
            ownerId: user.id,
            id: projectIds[0]
        },
        include: {
            owner: true,
            tasks: {
                orderBy: {
                    id: 'asc'
                }
            }
        }
    })

    console.log('\nProject loaded with include():')
    console.log('  Project:', project.name)
    console.log('  Owner:', project.owner.name, `(${project.owner.email})`)
    console.log('  Tasks:')

    for (const task of project.tasks) {
        const status = task.completed ? 'done' : 'open'
        console.log(`    [${status}] ${task.title}`)
    }

    // 3. Delete the user. Cascading foreign keys remove projects and tasks.
    await prisma.user.delete({
        where: {
            id: user.id
        }
    })

    const [userCount, projectCount, taskCount] = await Promise.all([
        prisma.user.count({
            where: {
                id: user.id
            }
        }),
        prisma.project.count({
            where: {
                ownerId: user.id
            }
        }),
        prisma.task.count({
            where: {
                projectId: {
                    in: projectIds
                }
            }
        })
    ])

    console.log('\nAfter deleting the user:')
    console.log('  Users remaining:', userCount)
    console.log('  Projects remaining:', projectCount)
    console.log('  Tasks remaining:', taskCount)

    if (userCount !== 0 || projectCount !== 0 || taskCount !== 0) {
        throw new Error('Cascade delete verification failed')
    }

    console.log('\nCascade delete verified successfully.')
}

main()
    .catch((error: unknown) => {
        console.error('Demo failed:', error)
        process.exitCode = 1
    })
    .finally(async () => {
        await prisma.$disconnect()
    })
