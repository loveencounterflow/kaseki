
'use strict'


############################################################################################################
GUY                       = require 'guy'
{ debug }                 = GUY.trm.get_loggers 'KASEKI/TYPES'
{ rpr
  inspect
  echo
  log     }               = GUY.trm
{ Intertype }             = require 'intertype'
base_types                = null
kaseki_types              = null
misfit                    = Symbol 'misfit'


#-----------------------------------------------------------------------------------------------------------
get_base_types = ->
  return base_types if base_types?
  #.........................................................................................................
  base_types                = new Intertype()
  { declare }               = base_types
  #.........................................................................................................
  # declare.dbay                  override: true, isa: ( x ) -> x?.constructor?.name is 'DBay'
  # declare.dbay_prefix                           isa: ( x ) -> ( @isa.text x ) and ( x.endsWith '_' )
  #.........................................................................................................
  return base_types

#-----------------------------------------------------------------------------------------------------------
get_kaseki_types = ->
  return kaseki_types if kaseki_types?
  #.........................................................................................................
  kaseki_types                = new Intertype get_base_types()
  { declare }                 = kaseki_types
  #.........................................................................................................
  declare.ksk_constructor_cfg
    fields:
      repo_path:          'nonempty.text'
      checkout_path:      'nonempty.text'
    default:
      repo_path:          null
      checkout_path:      null

  #     paths:
  #       public:     PATH.resolve __dirname, '../public'
  #       favicon:    PATH.resolve __dirname, '../public/favicon.png'
  #       src:        PATH.resolve __dirname, '../src'
  #     file_server:
  #       # Enable or disable accepting ranged requests. Disabling this will not send Accept-Ranges and ignore the
  #       # contents of the Range request header. defaults to true.
  #       acceptRanges:     true
  #       # Set Cache-Control response header, defaults to undefined, see docs: Cache-Control in MDN.
  #       cacheControl:     undefined
  #       # Enable or disable etag generation, defaults to true.
  #       etag:             true
  #       # Enable or disable Last-Modified header, defaults to true. Uses the file system's last modified value.
  #       # defaults to true.
  #       lastModified:     true
  #       # Set ignore rules. defaults to undefined. ( path ) => boolean
  #       ignore:           undefined
  #       # If true, serves after await next(), allowing any downstream middleware to respond first. defaults to false.
  #       defer:            false
  #...........................................................................................................
  return kaseki_types

module.exports = { misfit, get_base_types, get_kaseki_types, }


