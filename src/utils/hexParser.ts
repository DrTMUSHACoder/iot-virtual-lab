
export function loadHex(hex: string, flash: Uint16Array) {
    const lines = hex.split('\n');
    for (const line of lines) {
        if (line[0] !== ':' || line.length < 11) continue;

        const count = parseInt(line.substring(1, 3), 16);
        const address = parseInt(line.substring(3, 7), 16);
        const type = parseInt(line.substring(7, 9), 16);

        if (type === 0) { // Data record
            for (let i = 0; i < count; i++) {
                const byte = parseInt(line.substring(9 + i * 2, 11 + i * 2), 16);
                const flashAddr = (address + i) >> 1;
                if (address + i % 2 === 0) {
                    flash[flashAddr] = (flash[flashAddr] & 0xff00) | byte;
                } else {
                    flash[flashAddr] = (flash[flashAddr] & 0x00ff) | (byte << 8);
                }
            }
        }
    }
}
