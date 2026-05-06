<?xml version="1.0" encoding="UTF-8"?>
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:s="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes"/>

  <xsl:template match="/">
    <html lang="en">
      <head>
        <meta charset="UTF-8"/>
        <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
        <title>Mr. Nice Vape Sitemap</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; margin: 0; padding: 32px; background: #f8fafc; color: #0f172a; }
          .wrap { max-width: 1100px; margin: 0 auto; }
          h1 { margin: 0 0 10px; font-size: 30px; }
          p { margin: 0 0 24px; color: #475569; }
          .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 18px rgba(15,23,42,0.05); }
          table { width: 100%; border-collapse: collapse; }
          th, td { text-align: left; padding: 12px 14px; border-bottom: 1px solid #e2e8f0; font-size: 14px; vertical-align: top; }
          th { background: #f1f5f9; font-weight: 700; color: #0f172a; }
          tr:last-child td { border-bottom: 0; }
          a { color: #0f766e; text-decoration: none; word-break: break-all; }
          a:hover { text-decoration: underline; }
          .muted { color: #64748b; }
        </style>
      </head>
      <body>
        <div class="wrap">
          <h1>XML Sitemap</h1>
          <p>
            This sitemap contains <strong><xsl:value-of select="count(s:urlset/s:url) + count(s:sitemapindex/s:sitemap)"/></strong> URLs.
          </p>

          <div class="card">
            <xsl:choose>
              <xsl:when test="s:urlset">
                <table>
                  <thead>
                    <tr>
                      <th>URL</th>
                      <th>Last Modified</th>
                      <th>Change Frequency</th>
                      <th>Priority</th>
                    </tr>
                  </thead>
                  <tbody>
                    <xsl:for-each select="s:urlset/s:url">
                      <tr>
                        <td>
                          <a>
                            <xsl:attribute name="href"><xsl:value-of select="s:loc"/></xsl:attribute>
                            <xsl:value-of select="s:loc"/>
                          </a>
                        </td>
                        <td class="muted"><xsl:value-of select="s:lastmod"/></td>
                        <td class="muted"><xsl:value-of select="s:changefreq"/></td>
                        <td class="muted"><xsl:value-of select="s:priority"/></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </xsl:when>
              <xsl:otherwise>
                <table>
                  <thead>
                    <tr>
                      <th>Sitemap</th>
                      <th>Last Modified</th>
                    </tr>
                  </thead>
                  <tbody>
                    <xsl:for-each select="s:sitemapindex/s:sitemap">
                      <tr>
                        <td>
                          <a>
                            <xsl:attribute name="href"><xsl:value-of select="s:loc"/></xsl:attribute>
                            <xsl:value-of select="s:loc"/>
                          </a>
                        </td>
                        <td class="muted"><xsl:value-of select="s:lastmod"/></td>
                      </tr>
                    </xsl:for-each>
                  </tbody>
                </table>
              </xsl:otherwise>
            </xsl:choose>
          </div>
        </div>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
