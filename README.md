

# <ruby>化石<rp>(</rp> <rt>かせき</rt><rp>)</rp></ruby> <ruby>Ka<rp>(</rp><rt>化</rt><rp>)</rp></ruby><ruby>Seki<rp>(</rp> <rt>石</rt><rp>)</rp></ruby>




<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->
**Table of Contents**  *generated with [DocToc](https://github.com/thlorenz/doctoc)*

- [化石 KaSeki](#%E5%8C%96%E7%9F%B3-kaseki)
  - [To Do](#to-do)
  - [Is Done](#is-done)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

# 化石 KaSeki


## To Do

* **[–]** documentation
* **[–]** implement naming (and re-naming?) repo
* **[–]** allow querying of `.fslckout` DB, especially table `vvar`, there especially `where name =
  'repository'`
* **[–]** implement local settings, especially for `ignore-glob` (see
  [fossil-scm.org](https://www.fossil-scm.org/home/doc/trunk/www/settings.wiki), [SO
  answer](https://stackoverflow.com/a/23123528/7568091))

  ```bash
  mkdir .fossil-settings
  echo '*/*.suo' >> .fossil-settings/ignore-glob
  echo '*/*/bin/*' >> .fossil-settings/ignore-glob
  fossil add .fossil-settings
  ```

* **[–]** jumpstart a 'resonable API' by
  * **[–]** implement generic command with generic named, positional argument passing (without type
    checking); return value is raw text of the given `fossil` command, with trailing newlines removed
  * **[–]** compiling a list of all available `fossil` command line commands

## Is Done

* **[+]** MVP





