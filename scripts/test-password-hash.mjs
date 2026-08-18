import bcrypt from 'bcryptjs';

const hashProd = '$2b$10$RVjPOPk0dPOyIlMnevFYy.l6T9n173x9HB1EzByiwuzAqJL0jPSe.';
const hashQc = '$2b$10$4zJKMtnX3RmySeUESdFRPOUJvaFUvncrP4gg5qF1xtNwjr0MWJdTu';

const candidates = [
  'password',
  'password123',
  'admin',
  'admin123',
  '123456',
  '12345678',
  'khumkhum',
  'khumkhum123',
  'produksi',
  'produksi123',
  'warehouse',
  'warehouse123',
  'petugasproduksi',
  'qualitycontrol',
  'operator',
];

async function checkCandidates() {
  console.log('Testing candidates for hashProd...');
  for (const c of candidates) {
    if (await bcrypt.compare(c, hashProd)) {
      console.log(`🎉 Found match for hashProd: "${c}"`);
    }
    if (await bcrypt.compare(c, hashQc)) {
      console.log(`🎉 Found match for hashQc: "${c}"`);
    }
  }
}

checkCandidates();
