function diff(inp, interval) {
    let step = 0;
    while (step < inp.length) {
        if (read.substring(step, step + interval) != fillertext.substring(step, step + interval)) return step;
        step += interval;
    }
    return "?";
}