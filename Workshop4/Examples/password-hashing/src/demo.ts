import {
    argon2Options,
    hashPassword,
    verifyPassword
} from './password.js'


const password = 'CorrectHorseBatteryStaple2026!'


const showParameters = (passwordHash: string): string => {

    // Encoded Argon2 hashes look like:
    // $argon2id$v=19$m=19456,t=2,p=1$<salt>$<hash>

    const parts = passwordHash.split('$')

    return parts.slice(0, 4).join('$')

}


const main = async (): Promise<void> => {

    console.log('Password hashing with Argon2id\n')

    console.log('Configuration:', {

        type: 'argon2id',

        memoryCost: `${argon2Options.memoryCost} KiB (19 MiB)`,

        timeCost: argon2Options.timeCost,

        parallelism: argon2Options.parallelism

    })

    console.log(`\nOriginal password: ${password}`)

    console.log('The original password is never stored in the database.\n')


    // Hashing the same password twice demonstrates that Argon2id
    // generates a fresh random salt for every hash.

    const firstHash = await hashPassword(password)

    const secondHash = await hashPassword(password)

    console.log('First hash:')
    console.log(firstHash)

    console.log('\nSecond hash for the same password:')
    console.log(secondHash)

    console.log('\nEncoded parameters and salts:')

    console.log('  first :', showParameters(firstHash))

    console.log('  second:', showParameters(secondHash))

    console.log(

        '\nHashes differ:',

        firstHash === secondHash

            ? 'No - this would indicate a serious problem.'

            : 'Yes - each hash has its own random salt.'

    )


    // Correct password

    const correctResult = await verifyPassword(firstHash, password)

    console.log('\nVerify the correct password:', correctResult)


    // Wrong password

    const wrongResult = await verifyPassword(

        firstHash,

        'NotTheRightPassword2026!'

    )

    console.log('Verify a wrong password:    ', wrongResult)


    // Malformed hash

    const malformedResult = await verifyPassword(

        'not-a-valid-argon2-hash',

        password

    )

    console.log('Verify a malformed hash:    ', malformedResult)


    console.log('\nSummary:')

    console.log('- Registration hashes the password before storing it.')

    console.log('- Login verifies the submitted password against the stored hash.')

    console.log('- Wrong passwords and malformed hashes are rejected.')

    console.log('- A unique salt means identical passwords produce different hashes.')

}


main().catch((error: unknown) => {

    console.error('Password demo failed:', error)

    process.exitCode = 1

})
