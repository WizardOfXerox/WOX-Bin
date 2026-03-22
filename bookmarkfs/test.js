import('base65536').then(({ decode, encode }) => {

    const uint8Array = new Uint8Array([104, 101, 108, 108, 111, 32, 119, 111, 114, 108, 100])

    const string = encode(uint8Array)
    console.log(string);
    // 6 code points, '驨ꍬ啯𒁷ꍲᕤ'

    const uint8Array2 = new Uint8Array(decode(string))
    console.log(uint8Array2);

})