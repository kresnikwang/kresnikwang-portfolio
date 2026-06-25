const fs = require('fs');
const path = require('path');
const vm = require('vm');

const REPO_DIR = __dirname;
const indexHtmlPath = path.join(REPO_DIR, 'index.html');

console.log('🚀 Start pre-rendering static pages for SEO...');

// 1. Read index.html template
if (!fs.existsSync(indexHtmlPath)) {
  console.error(`❌ Error: index.html not found at ${indexHtmlPath}`);
  process.exit(1);
}
const templateHtml = fs.readFileSync(indexHtmlPath, 'utf8');

// 2. Extract projects array using VM context
const projectsMatch = templateHtml.match(/const projects = \s*([\s\S]*?);\s*\n\/\* === FILTER/);
if (!projectsMatch) {
  console.error('❌ Error: Could not parse projects array from index.html');
  process.exit(1);
}

const projectsCode = `var projects = ` + projectsMatch[1];
const sandbox = {};
try {
  vm.runInNewContext(projectsCode, sandbox);
} catch (e) {
  console.error('❌ Error running projects code in VM sandbox:', e);
  process.exit(1);
}

const projects = sandbox.projects;
console.log(`✅ Loaded ${projects.length} projects successfully.`);

// 3. Helper to replace metadata in HTML head
function getMetaReplacedHtml(html, pageTitle, pageDesc, pageUrl, pageImage, pageDepth) {
  let relativePrefix = '../'.repeat(pageDepth);
  
  // Replace Title
  let newHtml = html.replace(/<title>[\s\S]*?<\/title>/, `<title>${pageTitle}</title>`);
  
  // Replace Description meta tag
  newHtml = newHtml.replace(/<meta name="description" content="[\s\S]*?">/, `<meta name="description" content="${pageDesc}">`);
  
  // Replace Canonical Link
  newHtml = newHtml.replace(/<link rel="canonical" href="[\s\S]*?">/, `<link rel="canonical" href="${pageUrl}">`);
  
  // Replace Open Graph metadata
  newHtml = newHtml.replace(/<meta property="og:url" content="[\s\S]*?">/, `<meta property="og:url" content="${pageUrl}">`);
  newHtml = newHtml.replace(/<meta property="og:title" content="[\s\S]*?">/, `<meta property="og:title" content="${pageTitle}">`);
  newHtml = newHtml.replace(/<meta property="og:description" content="[\s\S]*?">/, `<meta property="og:description" content="${pageDesc}">`);
  newHtml = newHtml.replace(/<meta property="og:image" content="[\s\S]*?">/, `<meta property="og:image" content="${pageImage}">`);
  
  // Replace Twitter Card metadata
  newHtml = newHtml.replace(/<meta name="twitter:url" content="[\s\S]*?">/, `<meta name="twitter:url" content="${pageUrl}">`);
  newHtml = newHtml.replace(/<meta name="twitter:title" content="[\s\S]*?">/, `<meta name="twitter:title" content="${pageTitle}">`);
  newHtml = newHtml.replace(/<meta name="twitter:description" content="[\s\S]*?">/, `<meta name="twitter:description" content="${pageDesc}">`);
  newHtml = newHtml.replace(/<meta name="twitter:image" content="[\s\S]*?">/, `<meta name="twitter:image" content="${pageImage}">`);
  
  // Adjust logo image reference in header (relative to subpage depth)
  newHtml = newHtml.replace(/<img src="images\/logo\.webp"/, `<img src="${relativePrefix}images/logo.webp"`);
  
  return newHtml;
}

// 4. Pre-render project subpages
projects.forEach((p, idx) => {
  const prev = idx > 0 ? projects[idx - 1] : null;
  const next = idx < projects.length - 1 ? projects[idx + 1] : null;
  
  const pageTitle = `${p.title} by Kresnikwang — Commercial & Editorial Photography Portfolio`;
  const pageDesc = p.description || `${p.title} photography campaign shot by Shanghai photographer Kresnikwang. Client: ${p.client}. Services: ${p.services}.`;
  const pageUrl = `https://portfolio.kresnik.wang/project/${p.slug}/`;
  const pageImage = `https://portfolio.kresnik.wang/${p.cover}`;
  
  // Generate relative paths prefix for images
  const relativePrefix = '../../';
  
  // Pre-rendered inner HTML
  const preRenderedHtml = `
    <div class="page project-detail">
      <a href="#/" class="project-back">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>
        Back to Portfolio
      </a>
      <div class="project-header">
        <h1>${p.title}</h1>
        <div class="project-meta-row">
          <div class="meta-item"><span class="meta-label">Client</span><span class="meta-value">${p.client}</span></div>
          <div class="meta-item"><span class="meta-label">Services</span><span class="meta-value">${p.services}</span></div>
          <div class="meta-item"><span class="meta-label">Year</span><span class="meta-value">${p.year}</span></div>
        </div>
        ${p.description ? `<p class="project-desc">${p.description}</p>` : ''}
      </div>
      <div class="project-gallery">
        ${p.images.map((img) => `
          <img class="gallery-img" src="${relativePrefix}${img}" alt="${p.title} - ${p.client} Photography by Kresnikwang" loading="lazy">
        `).join('\n        ')}
      </div>
      <div class="project-nav">
        ${prev ? `<a href="#/project/${prev.slug}"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 12H5m0 0l7 7m-7-7l7-7"/></svg>${prev.title}</a>` : '<span></span>'}
        ${next ? `<a href="#/project/${next.slug}">${next.title}<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14m0 0l-7-7m7 7l-7 7"/></svg></a>` : '<span></span>'}
      </div>
    </div>`;
  
  // Inject metadata and pre-rendered body into template
  let pageHtml = getMetaReplacedHtml(templateHtml, pageTitle, pageDesc, pageUrl, pageImage, 2);
  pageHtml = pageHtml.replace('<main class="main-content" id="app"></main>', `<main class="main-content" id="app">${preRenderedHtml}</main>`);
  
  // Write file
  const projectDir = path.join(REPO_DIR, 'project', p.slug);
  fs.mkdirSync(projectDir, { recursive: true });
  fs.writeFileSync(path.join(projectDir, 'index.html'), pageHtml, 'utf8');
});
console.log(`✅ Pre-rendered ${projects.length} project pages successfully.`);

// 5. Pre-render About page
const aboutTitle = "About Kresnikwang — Commercial & Editorial Photography Portfolio";
const aboutDesc = "Kresnikwang (Kris) is a creative professional with 8 years of experience and passionate photographer. Shanghai-based commercial and editorial photographer.";
const aboutUrl = "https://portfolio.kresnik.wang/about/";
const aboutImage = "https://portfolio.kresnik.wang/images/logo.webp";

const preRenderedAboutHtml = `
    <div class="page about-page">
      <div class="about-layout">
        <img class="about-photo" src="../images/about.webp" alt="Kresnikwang">
        <div class="about-content">
          <h1>About Kresnikwang</h1>
          <p class="about-bio">Kresnikwang (Kris) is a creative professional with 8 years of experience and passionate photographer. He has worked as a producer for major sports brands including Nike, Jordan, and Converse since 2016. In 2018, he founded the independent creative company SKAND, operating under the philosophy "CREATE FOR MORE."<br><br>His photography spans diverse sports—from urban activities like basketball, street dance, skateboarding, and tennis, to extreme outdoor pursuits including skiing, hiking, and trail running. He emphasizes capturing authentic human emotion and experience in real sports moments to convey genuine atmosphere to consumers.</p>
          <div class="about-contact">
            <div class="contact-item"><span class="contact-label">Email</span><span class="contact-value"><a href="mailto:kris.wang@skandstudio.com">kris.wang@skandstudio.com</a></span></div>
            <div class="contact-item"><span class="contact-label">WeChat</span><span class="contact-value">Kresnikwang</span></div>
            <div class="contact-item"><span class="contact-label">Phone</span><span class="contact-value"><a href="tel:+8618967107623">+86 18967107623</a></span></div>
            <div class="contact-item"><span class="contact-label">Studio</span><span class="contact-value">Based At Shanghai & Hangzhou, China</span></div>
          </div>
        </div>
      </div>
    </div>`;

let aboutHtml = getMetaReplacedHtml(templateHtml, aboutTitle, aboutDesc, aboutUrl, aboutImage, 1);
aboutHtml = aboutHtml.replace('<main class="main-content" id="app"></main>', `<main class="main-content" id="app">${preRenderedAboutHtml}</main>`);

const aboutDir = path.join(REPO_DIR, 'about');
fs.mkdirSync(aboutDir, { recursive: true });
fs.writeFileSync(path.join(aboutDir, 'index.html'), aboutHtml, 'utf8');
console.log('✅ Pre-rendered About page successfully.');

// 6. Generate sitemap.xml
const today = new Date().toISOString().split('T')[0];
let sitemapContent = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1">
  <url>
    <loc>https://portfolio.kresnik.wang/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://portfolio.kresnik.wang/about/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
`;

projects.forEach((p) => {
  sitemapContent += `  <url>
    <loc>https://portfolio.kresnik.wang/project/${p.slug}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.7</priority>
  </url>
`;
});

sitemapContent += `</urlset>\n`;

fs.writeFileSync(path.join(REPO_DIR, 'sitemap.xml'), sitemapContent, 'utf8');
console.log('✅ Generated sitemap.xml successfully.');
console.log('🎉 Static pre-rendering completed successfully!');
