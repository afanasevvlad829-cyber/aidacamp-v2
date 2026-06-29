import { writeFileSync } from 'fs';
import { articles } from '../src/data/articles.js';

writeFileSync('/tmp/articles.json', JSON.stringify(articles, null, 2));
console.log(`Exported ${articles.length} articles → /tmp/articles.json`);
