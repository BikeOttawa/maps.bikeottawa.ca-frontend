(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
/**
 * jshashes - https://github.com/h2non/jshashes
 * Released under the "New BSD" license
 *
 * Algorithms specification:
 *
 * MD5 - http://www.ietf.org/rfc/rfc1321.txt
 * RIPEMD-160 - http://homes.esat.kuleuven.be/~bosselae/ripemd160.html
 * SHA1   - http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf
 * SHA256 - http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf
 * SHA512 - http://csrc.nist.gov/publications/fips/fips180-4/fips-180-4.pdf
 * HMAC - http://www.ietf.org/rfc/rfc2104.txt
 */
(function() {
  var Hashes;

  function utf8Encode(str) {
    var x, y, output = '',
      i = -1,
      l;

    if (str && str.length) {
      l = str.length;
      while ((i += 1) < l) {
        /* Decode utf-16 surrogate pairs */
        x = str.charCodeAt(i);
        y = i + 1 < l ? str.charCodeAt(i + 1) : 0;
        if (0xD800 <= x && x <= 0xDBFF && 0xDC00 <= y && y <= 0xDFFF) {
          x = 0x10000 + ((x & 0x03FF) << 10) + (y & 0x03FF);
          i += 1;
        }
        /* Encode output as utf-8 */
        if (x <= 0x7F) {
          output += String.fromCharCode(x);
        } else if (x <= 0x7FF) {
          output += String.fromCharCode(0xC0 | ((x >>> 6) & 0x1F),
            0x80 | (x & 0x3F));
        } else if (x <= 0xFFFF) {
          output += String.fromCharCode(0xE0 | ((x >>> 12) & 0x0F),
            0x80 | ((x >>> 6) & 0x3F),
            0x80 | (x & 0x3F));
        } else if (x <= 0x1FFFFF) {
          output += String.fromCharCode(0xF0 | ((x >>> 18) & 0x07),
            0x80 | ((x >>> 12) & 0x3F),
            0x80 | ((x >>> 6) & 0x3F),
            0x80 | (x & 0x3F));
        }
      }
    }
    return output;
  }

  function utf8Decode(str) {
    var i, ac, c1, c2, c3, arr = [],
      l;
    i = ac = c1 = c2 = c3 = 0;

    if (str && str.length) {
      l = str.length;
      str += '';

      while (i < l) {
        c1 = str.charCodeAt(i);
        ac += 1;
        if (c1 < 128) {
          arr[ac] = String.fromCharCode(c1);
          i += 1;
        } else if (c1 > 191 && c1 < 224) {
          c2 = str.charCodeAt(i + 1);
          arr[ac] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
          i += 2;
        } else {
          c2 = str.charCodeAt(i + 1);
          c3 = str.charCodeAt(i + 2);
          arr[ac] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
          i += 3;
        }
      }
    }
    return arr.join('');
  }

  /**
   * Add integers, wrapping at 2^32. This uses 16-bit operations internally
   * to work around bugs in some JS interpreters.
   */

  function safe_add(x, y) {
    var lsw = (x & 0xFFFF) + (y & 0xFFFF),
      msw = (x >> 16) + (y >> 16) + (lsw >> 16);
    return (msw << 16) | (lsw & 0xFFFF);
  }

  /**
   * Bitwise rotate a 32-bit number to the left.
   */

  function bit_rol(num, cnt) {
    return (num << cnt) | (num >>> (32 - cnt));
  }

  /**
   * Convert a raw string to a hex string
   */

  function rstr2hex(input, hexcase) {
    var hex_tab = hexcase ? '0123456789ABCDEF' : '0123456789abcdef',
      output = '',
      x, i = 0,
      l = input.length;
    for (; i < l; i += 1) {
      x = input.charCodeAt(i);
      output += hex_tab.charAt((x >>> 4) & 0x0F) + hex_tab.charAt(x & 0x0F);
    }
    return output;
  }

  /**
   * Encode a string as utf-16
   */

  function str2rstr_utf16le(input) {
    var i, l = input.length,
      output = '';
    for (i = 0; i < l; i += 1) {
      output += String.fromCharCode(input.charCodeAt(i) & 0xFF, (input.charCodeAt(i) >>> 8) & 0xFF);
    }
    return output;
  }

  function str2rstr_utf16be(input) {
    var i, l = input.length,
      output = '';
    for (i = 0; i < l; i += 1) {
      output += String.fromCharCode((input.charCodeAt(i) >>> 8) & 0xFF, input.charCodeAt(i) & 0xFF);
    }
    return output;
  }

  /**
   * Convert an array of big-endian words to a string
   */

  function binb2rstr(input) {
    var i, l = input.length * 32,
      output = '';
    for (i = 0; i < l; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (24 - i % 32)) & 0xFF);
    }
    return output;
  }

  /**
   * Convert an array of little-endian words to a string
   */

  function binl2rstr(input) {
    var i, l = input.length * 32,
      output = '';
    for (i = 0; i < l; i += 8) {
      output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
    }
    return output;
  }

  /**
   * Convert a raw string to an array of little-endian words
   * Characters >255 have their high-byte silently ignored.
   */

  function rstr2binl(input) {
    var i, l = input.length * 8,
      output = Array(input.length >> 2),
      lo = output.length;
    for (i = 0; i < lo; i += 1) {
      output[i] = 0;
    }
    for (i = 0; i < l; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (i % 32);
    }
    return output;
  }

  /**
   * Convert a raw string to an array of big-endian words
   * Characters >255 have their high-byte silently ignored.
   */

  function rstr2binb(input) {
    var i, l = input.length * 8,
      output = Array(input.length >> 2),
      lo = output.length;
    for (i = 0; i < lo; i += 1) {
      output[i] = 0;
    }
    for (i = 0; i < l; i += 8) {
      output[i >> 5] |= (input.charCodeAt(i / 8) & 0xFF) << (24 - i % 32);
    }
    return output;
  }

  /**
   * Convert a raw string to an arbitrary string encoding
   */

  function rstr2any(input, encoding) {
    var divisor = encoding.length,
      remainders = Array(),
      i, q, x, ld, quotient, dividend, output, full_length;

    /* Convert to an array of 16-bit big-endian values, forming the dividend */
    dividend = Array(Math.ceil(input.length / 2));
    ld = dividend.length;
    for (i = 0; i < ld; i += 1) {
      dividend[i] = (input.charCodeAt(i * 2) << 8) | input.charCodeAt(i * 2 + 1);
    }

    /**
     * Repeatedly perform a long division. The binary array forms the dividend,
     * the length of the encoding is the divisor. Once computed, the quotient
     * forms the dividend for the next step. We stop when the dividend is zerHashes.
     * All remainders are stored for later use.
     */
    while (dividend.length > 0) {
      quotient = Array();
      x = 0;
      for (i = 0; i < dividend.length; i += 1) {
        x = (x << 16) + dividend[i];
        q = Math.floor(x / divisor);
        x -= q * divisor;
        if (quotient.length > 0 || q > 0) {
          quotient[quotient.length] = q;
        }
      }
      remainders[remainders.length] = x;
      dividend = quotient;
    }

    /* Convert the remainders to the output string */
    output = '';
    for (i = remainders.length - 1; i >= 0; i--) {
      output += encoding.charAt(remainders[i]);
    }

    /* Append leading zero equivalents */
    full_length = Math.ceil(input.length * 8 / (Math.log(encoding.length) / Math.log(2)));
    for (i = output.length; i < full_length; i += 1) {
      output = encoding[0] + output;
    }
    return output;
  }

  /**
   * Convert a raw string to a base-64 string
   */

  function rstr2b64(input, b64pad) {
    var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
      output = '',
      len = input.length,
      i, j, triplet;
    b64pad = b64pad || '=';
    for (i = 0; i < len; i += 3) {
      triplet = (input.charCodeAt(i) << 16) | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0) | (i + 2 < len ? input.charCodeAt(i + 2) : 0);
      for (j = 0; j < 4; j += 1) {
        if (i * 8 + j * 6 > input.length * 8) {
          output += b64pad;
        } else {
          output += tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
        }
      }
    }
    return output;
  }

  Hashes = {
    /**
     * @property {String} version
     * @readonly
     */
    VERSION: '1.0.6',
    /**
     * @member Hashes
     * @class Base64
     * @constructor
     */
    Base64: function() {
      // private properties
      var tab = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/',
        pad = '=', // default pad according with the RFC standard
        url = false, // URL encoding support @todo
        utf8 = true; // by default enable UTF-8 support encoding

      // public method for encoding
      this.encode = function(input) {
        var i, j, triplet,
          output = '',
          len = input.length;

        pad = pad || '=';
        input = (utf8) ? utf8Encode(input) : input;

        for (i = 0; i < len; i += 3) {
          triplet = (input.charCodeAt(i) << 16) | (i + 1 < len ? input.charCodeAt(i + 1) << 8 : 0) | (i + 2 < len ? input.charCodeAt(i + 2) : 0);
          for (j = 0; j < 4; j += 1) {
            if (i * 8 + j * 6 > len * 8) {
              output += pad;
            } else {
              output += tab.charAt((triplet >>> 6 * (3 - j)) & 0x3F);
            }
          }
        }
        return output;
      };

      // public method for decoding
      this.decode = function(input) {
        // var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
        var i, o1, o2, o3, h1, h2, h3, h4, bits, ac,
          dec = '',
          arr = [];
        if (!input) {
          return input;
        }

        i = ac = 0;
        input = input.replace(new RegExp('\\' + pad, 'gi'), ''); // use '='
        //input += '';

        do { // unpack four hexets into three octets using index points in b64
          h1 = tab.indexOf(input.charAt(i += 1));
          h2 = tab.indexOf(input.charAt(i += 1));
          h3 = tab.indexOf(input.charAt(i += 1));
          h4 = tab.indexOf(input.charAt(i += 1));

          bits = h1 << 18 | h2 << 12 | h3 << 6 | h4;

          o1 = bits >> 16 & 0xff;
          o2 = bits >> 8 & 0xff;
          o3 = bits & 0xff;
          ac += 1;

          if (h3 === 64) {
            arr[ac] = String.fromCharCode(o1);
          } else if (h4 === 64) {
            arr[ac] = String.fromCharCode(o1, o2);
          } else {
            arr[ac] = String.fromCharCode(o1, o2, o3);
          }
        } while (i < input.length);

        dec = arr.join('');
        dec = (utf8) ? utf8Decode(dec) : dec;

        return dec;
      };

      // set custom pad string
      this.setPad = function(str) {
        pad = str || pad;
        return this;
      };
      // set custom tab string characters
      this.setTab = function(str) {
        tab = str || tab;
        return this;
      };
      this.setUTF8 = function(bool) {
        if (typeof bool === 'boolean') {
          utf8 = bool;
        }
        return this;
      };
    },

    /**
     * CRC-32 calculation
     * @member Hashes
     * @method CRC32
     * @static
     * @param {String} str Input String
     * @return {String}
     */
    CRC32: function(str) {
      var crc = 0,
        x = 0,
        y = 0,
        table, i, iTop;
      str = utf8Encode(str);

      table = [
        '00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 ',
        '79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 ',
        '84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F ',
        '63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD ',
        'A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC ',
        '51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 ',
        'B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 ',
        '06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 ',
        'E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 ',
        '12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 ',
        'D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 ',
        '33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 ',
        'CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 ',
        '9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E ',
        '7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D ',
        '806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 ',
        '60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA ',
        'AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 ',
        '5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 ',
        'B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 ',
        '05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 ',
        'F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA ',
        '11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 ',
        'D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F ',
        '30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E ',
        'C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D'
      ].join('');

      crc = crc ^ (-1);
      for (i = 0, iTop = str.length; i < iTop; i += 1) {
        y = (crc ^ str.charCodeAt(i)) & 0xFF;
        x = '0x' + table.substr(y * 9, 8);
        crc = (crc >>> 8) ^ x;
      }
      // always return a positive number (that's what >>> 0 does)
      return (crc ^ (-1)) >>> 0;
    },
    /**
     * @member Hashes
     * @class MD5
     * @constructor
     * @param {Object} [config]
     *
     * A JavaScript implementation of the RSA Data Security, Inc. MD5 Message
     * Digest Algorithm, as defined in RFC 1321.
     * Version 2.2 Copyright (C) Paul Johnston 1999 - 2009
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * See <http://pajhome.org.uk/crypt/md5> for more infHashes.
     */
    MD5: function(options) {
      /**
       * Private config properties. You may need to tweak these to be compatible with
       * the server-side, but the defaults work in most cases.
       * See {@link Hashes.MD5#method-setUpperCase} and {@link Hashes.SHA1#method-setUpperCase}
       */
      var hexcase = (options && typeof options.uppercase === 'boolean') ? options.uppercase : false, // hexadecimal output case format. false - lowercase; true - uppercase
        b64pad = (options && typeof options.pad === 'string') ? options.pad : '=', // base-64 pad character. Defaults to '=' for strict RFC compliance
        utf8 = (options && typeof options.utf8 === 'boolean') ? options.utf8 : true; // enable/disable utf8 encoding

      // privileged (public) methods
      this.hex = function(s) {
        return rstr2hex(rstr(s, utf8), hexcase);
      };
      this.b64 = function(s) {
        return rstr2b64(rstr(s), b64pad);
      };
      this.any = function(s, e) {
        return rstr2any(rstr(s, utf8), e);
      };
      this.raw = function(s) {
        return rstr(s, utf8);
      };
      this.hex_hmac = function(k, d) {
        return rstr2hex(rstr_hmac(k, d), hexcase);
      };
      this.b64_hmac = function(k, d) {
        return rstr2b64(rstr_hmac(k, d), b64pad);
      };
      this.any_hmac = function(k, d, e) {
        return rstr2any(rstr_hmac(k, d), e);
      };
      /**
       * Perform a simple self-test to see if the VM is working
       * @return {String} Hexadecimal hash sample
       */
      this.vm_test = function() {
        return hex('abc').toLowerCase() === '900150983cd24fb0d6963f7d28e17f72';
      };
      /**
       * Enable/disable uppercase hexadecimal returned string
       * @param {Boolean}
       * @return {Object} this
       */
      this.setUpperCase = function(a) {
        if (typeof a === 'boolean') {
          hexcase = a;
        }
        return this;
      };
      /**
       * Defines a base64 pad string
       * @param {String} Pad
       * @return {Object} this
       */
      this.setPad = function(a) {
        b64pad = a || b64pad;
        return this;
      };
      /**
       * Defines a base64 pad string
       * @param {Boolean}
       * @return {Object} [this]
       */
      this.setUTF8 = function(a) {
        if (typeof a === 'boolean') {
          utf8 = a;
        }
        return this;
      };

      // private methods

      /**
       * Calculate the MD5 of a raw string
       */

      function rstr(s) {
        s = (utf8) ? utf8Encode(s) : s;
        return binl2rstr(binl(rstr2binl(s), s.length * 8));
      }

      /**
       * Calculate the HMAC-MD5, of a key and some data (raw strings)
       */

      function rstr_hmac(key, data) {
        var bkey, ipad, opad, hash, i;

        key = (utf8) ? utf8Encode(key) : key;
        data = (utf8) ? utf8Encode(data) : data;
        bkey = rstr2binl(key);
        if (bkey.length > 16) {
          bkey = binl(bkey, key.length * 8);
        }

        ipad = Array(16), opad = Array(16);
        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = binl(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl(opad.concat(hash), 512 + 128));
      }

      /**
       * Calculate the MD5 of an array of little-endian words, and a bit length.
       */

      function binl(x, len) {
        var i, olda, oldb, oldc, oldd,
          a = 1732584193,
          b = -271733879,
          c = -1732584194,
          d = 271733878;

        /* append padding */
        x[len >> 5] |= 0x80 << ((len) % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;

        for (i = 0; i < x.length; i += 16) {
          olda = a;
          oldb = b;
          oldc = c;
          oldd = d;

          a = md5_ff(a, b, c, d, x[i + 0], 7, -680876936);
          d = md5_ff(d, a, b, c, x[i + 1], 12, -389564586);
          c = md5_ff(c, d, a, b, x[i + 2], 17, 606105819);
          b = md5_ff(b, c, d, a, x[i + 3], 22, -1044525330);
          a = md5_ff(a, b, c, d, x[i + 4], 7, -176418897);
          d = md5_ff(d, a, b, c, x[i + 5], 12, 1200080426);
          c = md5_ff(c, d, a, b, x[i + 6], 17, -1473231341);
          b = md5_ff(b, c, d, a, x[i + 7], 22, -45705983);
          a = md5_ff(a, b, c, d, x[i + 8], 7, 1770035416);
          d = md5_ff(d, a, b, c, x[i + 9], 12, -1958414417);
          c = md5_ff(c, d, a, b, x[i + 10], 17, -42063);
          b = md5_ff(b, c, d, a, x[i + 11], 22, -1990404162);
          a = md5_ff(a, b, c, d, x[i + 12], 7, 1804603682);
          d = md5_ff(d, a, b, c, x[i + 13], 12, -40341101);
          c = md5_ff(c, d, a, b, x[i + 14], 17, -1502002290);
          b = md5_ff(b, c, d, a, x[i + 15], 22, 1236535329);

          a = md5_gg(a, b, c, d, x[i + 1], 5, -165796510);
          d = md5_gg(d, a, b, c, x[i + 6], 9, -1069501632);
          c = md5_gg(c, d, a, b, x[i + 11], 14, 643717713);
          b = md5_gg(b, c, d, a, x[i + 0], 20, -373897302);
          a = md5_gg(a, b, c, d, x[i + 5], 5, -701558691);
          d = md5_gg(d, a, b, c, x[i + 10], 9, 38016083);
          c = md5_gg(c, d, a, b, x[i + 15], 14, -660478335);
          b = md5_gg(b, c, d, a, x[i + 4], 20, -405537848);
          a = md5_gg(a, b, c, d, x[i + 9], 5, 568446438);
          d = md5_gg(d, a, b, c, x[i + 14], 9, -1019803690);
          c = md5_gg(c, d, a, b, x[i + 3], 14, -187363961);
          b = md5_gg(b, c, d, a, x[i + 8], 20, 1163531501);
          a = md5_gg(a, b, c, d, x[i + 13], 5, -1444681467);
          d = md5_gg(d, a, b, c, x[i + 2], 9, -51403784);
          c = md5_gg(c, d, a, b, x[i + 7], 14, 1735328473);
          b = md5_gg(b, c, d, a, x[i + 12], 20, -1926607734);

          a = md5_hh(a, b, c, d, x[i + 5], 4, -378558);
          d = md5_hh(d, a, b, c, x[i + 8], 11, -2022574463);
          c = md5_hh(c, d, a, b, x[i + 11], 16, 1839030562);
          b = md5_hh(b, c, d, a, x[i + 14], 23, -35309556);
          a = md5_hh(a, b, c, d, x[i + 1], 4, -1530992060);
          d = md5_hh(d, a, b, c, x[i + 4], 11, 1272893353);
          c = md5_hh(c, d, a, b, x[i + 7], 16, -155497632);
          b = md5_hh(b, c, d, a, x[i + 10], 23, -1094730640);
          a = md5_hh(a, b, c, d, x[i + 13], 4, 681279174);
          d = md5_hh(d, a, b, c, x[i + 0], 11, -358537222);
          c = md5_hh(c, d, a, b, x[i + 3], 16, -722521979);
          b = md5_hh(b, c, d, a, x[i + 6], 23, 76029189);
          a = md5_hh(a, b, c, d, x[i + 9], 4, -640364487);
          d = md5_hh(d, a, b, c, x[i + 12], 11, -421815835);
          c = md5_hh(c, d, a, b, x[i + 15], 16, 530742520);
          b = md5_hh(b, c, d, a, x[i + 2], 23, -995338651);

          a = md5_ii(a, b, c, d, x[i + 0], 6, -198630844);
          d = md5_ii(d, a, b, c, x[i + 7], 10, 1126891415);
          c = md5_ii(c, d, a, b, x[i + 14], 15, -1416354905);
          b = md5_ii(b, c, d, a, x[i + 5], 21, -57434055);
          a = md5_ii(a, b, c, d, x[i + 12], 6, 1700485571);
          d = md5_ii(d, a, b, c, x[i + 3], 10, -1894986606);
          c = md5_ii(c, d, a, b, x[i + 10], 15, -1051523);
          b = md5_ii(b, c, d, a, x[i + 1], 21, -2054922799);
          a = md5_ii(a, b, c, d, x[i + 8], 6, 1873313359);
          d = md5_ii(d, a, b, c, x[i + 15], 10, -30611744);
          c = md5_ii(c, d, a, b, x[i + 6], 15, -1560198380);
          b = md5_ii(b, c, d, a, x[i + 13], 21, 1309151649);
          a = md5_ii(a, b, c, d, x[i + 4], 6, -145523070);
          d = md5_ii(d, a, b, c, x[i + 11], 10, -1120210379);
          c = md5_ii(c, d, a, b, x[i + 2], 15, 718787259);
          b = md5_ii(b, c, d, a, x[i + 9], 21, -343485551);

          a = safe_add(a, olda);
          b = safe_add(b, oldb);
          c = safe_add(c, oldc);
          d = safe_add(d, oldd);
        }
        return Array(a, b, c, d);
      }

      /**
       * These functions implement the four basic operations the algorithm uses.
       */

      function md5_cmn(q, a, b, x, s, t) {
        return safe_add(bit_rol(safe_add(safe_add(a, q), safe_add(x, t)), s), b);
      }

      function md5_ff(a, b, c, d, x, s, t) {
        return md5_cmn((b & c) | ((~b) & d), a, b, x, s, t);
      }

      function md5_gg(a, b, c, d, x, s, t) {
        return md5_cmn((b & d) | (c & (~d)), a, b, x, s, t);
      }

      function md5_hh(a, b, c, d, x, s, t) {
        return md5_cmn(b ^ c ^ d, a, b, x, s, t);
      }

      function md5_ii(a, b, c, d, x, s, t) {
        return md5_cmn(c ^ (b | (~d)), a, b, x, s, t);
      }
    },
    /**
     * @member Hashes
     * @class Hashes.SHA1
     * @param {Object} [config]
     * @constructor
     *
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-1, as defined in FIPS 180-1
     * Version 2.2 Copyright Paul Johnston 2000 - 2009.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * See http://pajhome.org.uk/crypt/md5 for details.
     */
    SHA1: function(options) {
      /**
       * Private config properties. You may need to tweak these to be compatible with
       * the server-side, but the defaults work in most cases.
       * See {@link Hashes.MD5#method-setUpperCase} and {@link Hashes.SHA1#method-setUpperCase}
       */
      var hexcase = (options && typeof options.uppercase === 'boolean') ? options.uppercase : false, // hexadecimal output case format. false - lowercase; true - uppercase
        b64pad = (options && typeof options.pad === 'string') ? options.pad : '=', // base-64 pad character. Defaults to '=' for strict RFC compliance
        utf8 = (options && typeof options.utf8 === 'boolean') ? options.utf8 : true; // enable/disable utf8 encoding

      // public methods
      this.hex = function(s) {
        return rstr2hex(rstr(s, utf8), hexcase);
      };
      this.b64 = function(s) {
        return rstr2b64(rstr(s, utf8), b64pad);
      };
      this.any = function(s, e) {
        return rstr2any(rstr(s, utf8), e);
      };
      this.raw = function(s) {
        return rstr(s, utf8);
      };
      this.hex_hmac = function(k, d) {
        return rstr2hex(rstr_hmac(k, d));
      };
      this.b64_hmac = function(k, d) {
        return rstr2b64(rstr_hmac(k, d), b64pad);
      };
      this.any_hmac = function(k, d, e) {
        return rstr2any(rstr_hmac(k, d), e);
      };
      /**
       * Perform a simple self-test to see if the VM is working
       * @return {String} Hexadecimal hash sample
       * @public
       */
      this.vm_test = function() {
        return hex('abc').toLowerCase() === '900150983cd24fb0d6963f7d28e17f72';
      };
      /**
       * @description Enable/disable uppercase hexadecimal returned string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUpperCase = function(a) {
        if (typeof a === 'boolean') {
          hexcase = a;
        }
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {string} Pad
       * @return {Object} this
       * @public
       */
      this.setPad = function(a) {
        b64pad = a || b64pad;
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUTF8 = function(a) {
        if (typeof a === 'boolean') {
          utf8 = a;
        }
        return this;
      };

      // private methods

      /**
       * Calculate the SHA-512 of a raw string
       */

      function rstr(s) {
        s = (utf8) ? utf8Encode(s) : s;
        return binb2rstr(binb(rstr2binb(s), s.length * 8));
      }

      /**
       * Calculate the HMAC-SHA1 of a key and some data (raw strings)
       */

      function rstr_hmac(key, data) {
        var bkey, ipad, opad, i, hash;
        key = (utf8) ? utf8Encode(key) : key;
        data = (utf8) ? utf8Encode(data) : data;
        bkey = rstr2binb(key);

        if (bkey.length > 16) {
          bkey = binb(bkey, key.length * 8);
        }
        ipad = Array(16), opad = Array(16);
        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = binb(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
        return binb2rstr(binb(opad.concat(hash), 512 + 160));
      }

      /**
       * Calculate the SHA-1 of an array of big-endian words, and a bit length
       */

      function binb(x, len) {
        var i, j, t, olda, oldb, oldc, oldd, olde,
          w = Array(80),
          a = 1732584193,
          b = -271733879,
          c = -1732584194,
          d = 271733878,
          e = -1009589776;

        /* append padding */
        x[len >> 5] |= 0x80 << (24 - len % 32);
        x[((len + 64 >> 9) << 4) + 15] = len;

        for (i = 0; i < x.length; i += 16) {
          olda = a;
          oldb = b;
          oldc = c;
          oldd = d;
          olde = e;

          for (j = 0; j < 80; j += 1) {
            if (j < 16) {
              w[j] = x[i + j];
            } else {
              w[j] = bit_rol(w[j - 3] ^ w[j - 8] ^ w[j - 14] ^ w[j - 16], 1);
            }
            t = safe_add(safe_add(bit_rol(a, 5), sha1_ft(j, b, c, d)),
              safe_add(safe_add(e, w[j]), sha1_kt(j)));
            e = d;
            d = c;
            c = bit_rol(b, 30);
            b = a;
            a = t;
          }

          a = safe_add(a, olda);
          b = safe_add(b, oldb);
          c = safe_add(c, oldc);
          d = safe_add(d, oldd);
          e = safe_add(e, olde);
        }
        return Array(a, b, c, d, e);
      }

      /**
       * Perform the appropriate triplet combination function for the current
       * iteration
       */

      function sha1_ft(t, b, c, d) {
        if (t < 20) {
          return (b & c) | ((~b) & d);
        }
        if (t < 40) {
          return b ^ c ^ d;
        }
        if (t < 60) {
          return (b & c) | (b & d) | (c & d);
        }
        return b ^ c ^ d;
      }

      /**
       * Determine the appropriate additive constant for the current iteration
       */

      function sha1_kt(t) {
        return (t < 20) ? 1518500249 : (t < 40) ? 1859775393 :
          (t < 60) ? -1894007588 : -899497514;
      }
    },
    /**
     * @class Hashes.SHA256
     * @param {config}
     *
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-256, as defined in FIPS 180-2
     * Version 2.2 Copyright Angel Marin, Paul Johnston 2000 - 2009.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * See http://pajhome.org.uk/crypt/md5 for details.
     * Also http://anmar.eu.org/projects/jssha2/
     */
    SHA256: function(options) {
      /**
       * Private properties configuration variables. You may need to tweak these to be compatible with
       * the server-side, but the defaults work in most cases.
       * @see this.setUpperCase() method
       * @see this.setPad() method
       */
      var hexcase = (options && typeof options.uppercase === 'boolean') ? options.uppercase : false, // hexadecimal output case format. false - lowercase; true - uppercase  */
        b64pad = (options && typeof options.pad === 'string') ? options.pad : '=',
        /* base-64 pad character. Default '=' for strict RFC compliance   */
        utf8 = (options && typeof options.utf8 === 'boolean') ? options.utf8 : true,
        /* enable/disable utf8 encoding */
        sha256_K;

      /* privileged (public) methods */
      this.hex = function(s) {
        return rstr2hex(rstr(s, utf8));
      };
      this.b64 = function(s) {
        return rstr2b64(rstr(s, utf8), b64pad);
      };
      this.any = function(s, e) {
        return rstr2any(rstr(s, utf8), e);
      };
      this.raw = function(s) {
        return rstr(s, utf8);
      };
      this.hex_hmac = function(k, d) {
        return rstr2hex(rstr_hmac(k, d));
      };
      this.b64_hmac = function(k, d) {
        return rstr2b64(rstr_hmac(k, d), b64pad);
      };
      this.any_hmac = function(k, d, e) {
        return rstr2any(rstr_hmac(k, d), e);
      };
      /**
       * Perform a simple self-test to see if the VM is working
       * @return {String} Hexadecimal hash sample
       * @public
       */
      this.vm_test = function() {
        return hex('abc').toLowerCase() === '900150983cd24fb0d6963f7d28e17f72';
      };
      /**
       * Enable/disable uppercase hexadecimal returned string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUpperCase = function(a) {
        if (typeof a === 'boolean') {
          hexcase = a;
        }
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {string} Pad
       * @return {Object} this
       * @public
       */
      this.setPad = function(a) {
        b64pad = a || b64pad;
        return this;
      };
      /**
       * Defines a base64 pad string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUTF8 = function(a) {
        if (typeof a === 'boolean') {
          utf8 = a;
        }
        return this;
      };

      // private methods

      /**
       * Calculate the SHA-512 of a raw string
       */

      function rstr(s, utf8) {
        s = (utf8) ? utf8Encode(s) : s;
        return binb2rstr(binb(rstr2binb(s), s.length * 8));
      }

      /**
       * Calculate the HMAC-sha256 of a key and some data (raw strings)
       */

      function rstr_hmac(key, data) {
        key = (utf8) ? utf8Encode(key) : key;
        data = (utf8) ? utf8Encode(data) : data;
        var hash, i = 0,
          bkey = rstr2binb(key),
          ipad = Array(16),
          opad = Array(16);

        if (bkey.length > 16) {
          bkey = binb(bkey, key.length * 8);
        }

        for (; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        hash = binb(ipad.concat(rstr2binb(data)), 512 + data.length * 8);
        return binb2rstr(binb(opad.concat(hash), 512 + 256));
      }

      /*
       * Main sha256 function, with its support functions
       */

      function sha256_S(X, n) {
        return (X >>> n) | (X << (32 - n));
      }

      function sha256_R(X, n) {
        return (X >>> n);
      }

      function sha256_Ch(x, y, z) {
        return ((x & y) ^ ((~x) & z));
      }

      function sha256_Maj(x, y, z) {
        return ((x & y) ^ (x & z) ^ (y & z));
      }

      function sha256_Sigma0256(x) {
        return (sha256_S(x, 2) ^ sha256_S(x, 13) ^ sha256_S(x, 22));
      }

      function sha256_Sigma1256(x) {
        return (sha256_S(x, 6) ^ sha256_S(x, 11) ^ sha256_S(x, 25));
      }

      function sha256_Gamma0256(x) {
        return (sha256_S(x, 7) ^ sha256_S(x, 18) ^ sha256_R(x, 3));
      }

      function sha256_Gamma1256(x) {
        return (sha256_S(x, 17) ^ sha256_S(x, 19) ^ sha256_R(x, 10));
      }

      function sha256_Sigma0512(x) {
        return (sha256_S(x, 28) ^ sha256_S(x, 34) ^ sha256_S(x, 39));
      }

      function sha256_Sigma1512(x) {
        return (sha256_S(x, 14) ^ sha256_S(x, 18) ^ sha256_S(x, 41));
      }

      function sha256_Gamma0512(x) {
        return (sha256_S(x, 1) ^ sha256_S(x, 8) ^ sha256_R(x, 7));
      }

      function sha256_Gamma1512(x) {
        return (sha256_S(x, 19) ^ sha256_S(x, 61) ^ sha256_R(x, 6));
      }

      sha256_K = [
        1116352408, 1899447441, -1245643825, -373957723, 961987163, 1508970993, -1841331548, -1424204075, -670586216, 310598401, 607225278, 1426881987,
        1925078388, -2132889090, -1680079193, -1046744716, -459576895, -272742522,
        264347078, 604807628, 770255983, 1249150122, 1555081692, 1996064986, -1740746414, -1473132947, -1341970488, -1084653625, -958395405, -710438585,
        113926993, 338241895, 666307205, 773529912, 1294757372, 1396182291,
        1695183700, 1986661051, -2117940946, -1838011259, -1564481375, -1474664885, -1035236496, -949202525, -778901479, -694614492, -200395387, 275423344,
        430227734, 506948616, 659060556, 883997877, 958139571, 1322822218,
        1537002063, 1747873779, 1955562222, 2024104815, -2067236844, -1933114872, -1866530822, -1538233109, -1090935817, -965641998
      ];

      function binb(m, l) {
        var HASH = [1779033703, -1150833019, 1013904242, -1521486534,
          1359893119, -1694144372, 528734635, 1541459225
        ];
        var W = new Array(64);
        var a, b, c, d, e, f, g, h;
        var i, j, T1, T2;

        /* append padding */
        m[l >> 5] |= 0x80 << (24 - l % 32);
        m[((l + 64 >> 9) << 4) + 15] = l;

        for (i = 0; i < m.length; i += 16) {
          a = HASH[0];
          b = HASH[1];
          c = HASH[2];
          d = HASH[3];
          e = HASH[4];
          f = HASH[5];
          g = HASH[6];
          h = HASH[7];

          for (j = 0; j < 64; j += 1) {
            if (j < 16) {
              W[j] = m[j + i];
            } else {
              W[j] = safe_add(safe_add(safe_add(sha256_Gamma1256(W[j - 2]), W[j - 7]),
                sha256_Gamma0256(W[j - 15])), W[j - 16]);
            }

            T1 = safe_add(safe_add(safe_add(safe_add(h, sha256_Sigma1256(e)), sha256_Ch(e, f, g)),
              sha256_K[j]), W[j]);
            T2 = safe_add(sha256_Sigma0256(a), sha256_Maj(a, b, c));
            h = g;
            g = f;
            f = e;
            e = safe_add(d, T1);
            d = c;
            c = b;
            b = a;
            a = safe_add(T1, T2);
          }

          HASH[0] = safe_add(a, HASH[0]);
          HASH[1] = safe_add(b, HASH[1]);
          HASH[2] = safe_add(c, HASH[2]);
          HASH[3] = safe_add(d, HASH[3]);
          HASH[4] = safe_add(e, HASH[4]);
          HASH[5] = safe_add(f, HASH[5]);
          HASH[6] = safe_add(g, HASH[6]);
          HASH[7] = safe_add(h, HASH[7]);
        }
        return HASH;
      }

    },

    /**
     * @class Hashes.SHA512
     * @param {config}
     *
     * A JavaScript implementation of the Secure Hash Algorithm, SHA-512, as defined in FIPS 180-2
     * Version 2.2 Copyright Anonymous Contributor, Paul Johnston 2000 - 2009.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * See http://pajhome.org.uk/crypt/md5 for details.
     */
    SHA512: function(options) {
      /**
       * Private properties configuration variables. You may need to tweak these to be compatible with
       * the server-side, but the defaults work in most cases.
       * @see this.setUpperCase() method
       * @see this.setPad() method
       */
      var hexcase = (options && typeof options.uppercase === 'boolean') ? options.uppercase : false,
        /* hexadecimal output case format. false - lowercase; true - uppercase  */
        b64pad = (options && typeof options.pad === 'string') ? options.pad : '=',
        /* base-64 pad character. Default '=' for strict RFC compliance   */
        utf8 = (options && typeof options.utf8 === 'boolean') ? options.utf8 : true,
        /* enable/disable utf8 encoding */
        sha512_k;

      /* privileged (public) methods */
      this.hex = function(s) {
        return rstr2hex(rstr(s));
      };
      this.b64 = function(s) {
        return rstr2b64(rstr(s), b64pad);
      };
      this.any = function(s, e) {
        return rstr2any(rstr(s), e);
      };
      this.raw = function(s) {
        return rstr(s, utf8);
      };
      this.hex_hmac = function(k, d) {
        return rstr2hex(rstr_hmac(k, d));
      };
      this.b64_hmac = function(k, d) {
        return rstr2b64(rstr_hmac(k, d), b64pad);
      };
      this.any_hmac = function(k, d, e) {
        return rstr2any(rstr_hmac(k, d), e);
      };
      /**
       * Perform a simple self-test to see if the VM is working
       * @return {String} Hexadecimal hash sample
       * @public
       */
      this.vm_test = function() {
        return hex('abc').toLowerCase() === '900150983cd24fb0d6963f7d28e17f72';
      };
      /**
       * @description Enable/disable uppercase hexadecimal returned string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUpperCase = function(a) {
        if (typeof a === 'boolean') {
          hexcase = a;
        }
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {string} Pad
       * @return {Object} this
       * @public
       */
      this.setPad = function(a) {
        b64pad = a || b64pad;
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUTF8 = function(a) {
        if (typeof a === 'boolean') {
          utf8 = a;
        }
        return this;
      };

      /* private methods */

      /**
       * Calculate the SHA-512 of a raw string
       */

      function rstr(s) {
        s = (utf8) ? utf8Encode(s) : s;
        return binb2rstr(binb(rstr2binb(s), s.length * 8));
      }
      /*
       * Calculate the HMAC-SHA-512 of a key and some data (raw strings)
       */

      function rstr_hmac(key, data) {
        key = (utf8) ? utf8Encode(key) : key;
        data = (utf8) ? utf8Encode(data) : data;

        var hash, i = 0,
          bkey = rstr2binb(key),
          ipad = Array(32),
          opad = Array(32);

        if (bkey.length > 32) {
          bkey = binb(bkey, key.length * 8);
        }

        for (; i < 32; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }

        hash = binb(ipad.concat(rstr2binb(data)), 1024 + data.length * 8);
        return binb2rstr(binb(opad.concat(hash), 1024 + 512));
      }

      /**
       * Calculate the SHA-512 of an array of big-endian dwords, and a bit length
       */

      function binb(x, len) {
        var j, i, l,
          W = new Array(80),
          hash = new Array(16),
          //Initial hash values
          H = [
            new int64(0x6a09e667, -205731576),
            new int64(-1150833019, -2067093701),
            new int64(0x3c6ef372, -23791573),
            new int64(-1521486534, 0x5f1d36f1),
            new int64(0x510e527f, -1377402159),
            new int64(-1694144372, 0x2b3e6c1f),
            new int64(0x1f83d9ab, -79577749),
            new int64(0x5be0cd19, 0x137e2179)
          ],
          T1 = new int64(0, 0),
          T2 = new int64(0, 0),
          a = new int64(0, 0),
          b = new int64(0, 0),
          c = new int64(0, 0),
          d = new int64(0, 0),
          e = new int64(0, 0),
          f = new int64(0, 0),
          g = new int64(0, 0),
          h = new int64(0, 0),
          //Temporary variables not specified by the document
          s0 = new int64(0, 0),
          s1 = new int64(0, 0),
          Ch = new int64(0, 0),
          Maj = new int64(0, 0),
          r1 = new int64(0, 0),
          r2 = new int64(0, 0),
          r3 = new int64(0, 0);

        if (sha512_k === undefined) {
          //SHA512 constants
          sha512_k = [
            new int64(0x428a2f98, -685199838), new int64(0x71374491, 0x23ef65cd),
            new int64(-1245643825, -330482897), new int64(-373957723, -2121671748),
            new int64(0x3956c25b, -213338824), new int64(0x59f111f1, -1241133031),
            new int64(-1841331548, -1357295717), new int64(-1424204075, -630357736),
            new int64(-670586216, -1560083902), new int64(0x12835b01, 0x45706fbe),
            new int64(0x243185be, 0x4ee4b28c), new int64(0x550c7dc3, -704662302),
            new int64(0x72be5d74, -226784913), new int64(-2132889090, 0x3b1696b1),
            new int64(-1680079193, 0x25c71235), new int64(-1046744716, -815192428),
            new int64(-459576895, -1628353838), new int64(-272742522, 0x384f25e3),
            new int64(0xfc19dc6, -1953704523), new int64(0x240ca1cc, 0x77ac9c65),
            new int64(0x2de92c6f, 0x592b0275), new int64(0x4a7484aa, 0x6ea6e483),
            new int64(0x5cb0a9dc, -1119749164), new int64(0x76f988da, -2096016459),
            new int64(-1740746414, -295247957), new int64(-1473132947, 0x2db43210),
            new int64(-1341970488, -1728372417), new int64(-1084653625, -1091629340),
            new int64(-958395405, 0x3da88fc2), new int64(-710438585, -1828018395),
            new int64(0x6ca6351, -536640913), new int64(0x14292967, 0xa0e6e70),
            new int64(0x27b70a85, 0x46d22ffc), new int64(0x2e1b2138, 0x5c26c926),
            new int64(0x4d2c6dfc, 0x5ac42aed), new int64(0x53380d13, -1651133473),
            new int64(0x650a7354, -1951439906), new int64(0x766a0abb, 0x3c77b2a8),
            new int64(-2117940946, 0x47edaee6), new int64(-1838011259, 0x1482353b),
            new int64(-1564481375, 0x4cf10364), new int64(-1474664885, -1136513023),
            new int64(-1035236496, -789014639), new int64(-949202525, 0x654be30),
            new int64(-778901479, -688958952), new int64(-694614492, 0x5565a910),
            new int64(-200395387, 0x5771202a), new int64(0x106aa070, 0x32bbd1b8),
            new int64(0x19a4c116, -1194143544), new int64(0x1e376c08, 0x5141ab53),
            new int64(0x2748774c, -544281703), new int64(0x34b0bcb5, -509917016),
            new int64(0x391c0cb3, -976659869), new int64(0x4ed8aa4a, -482243893),
            new int64(0x5b9cca4f, 0x7763e373), new int64(0x682e6ff3, -692930397),
            new int64(0x748f82ee, 0x5defb2fc), new int64(0x78a5636f, 0x43172f60),
            new int64(-2067236844, -1578062990), new int64(-1933114872, 0x1a6439ec),
            new int64(-1866530822, 0x23631e28), new int64(-1538233109, -561857047),
            new int64(-1090935817, -1295615723), new int64(-965641998, -479046869),
            new int64(-903397682, -366583396), new int64(-779700025, 0x21c0c207),
            new int64(-354779690, -840897762), new int64(-176337025, -294727304),
            new int64(0x6f067aa, 0x72176fba), new int64(0xa637dc5, -1563912026),
            new int64(0x113f9804, -1090974290), new int64(0x1b710b35, 0x131c471b),
            new int64(0x28db77f5, 0x23047d84), new int64(0x32caab7b, 0x40c72493),
            new int64(0x3c9ebe0a, 0x15c9bebc), new int64(0x431d67c4, -1676669620),
            new int64(0x4cc5d4be, -885112138), new int64(0x597f299c, -60457430),
            new int64(0x5fcb6fab, 0x3ad6faec), new int64(0x6c44198c, 0x4a475817)
          ];
        }

        for (i = 0; i < 80; i += 1) {
          W[i] = new int64(0, 0);
        }

        // append padding to the source string. The format is described in the FIPS.
        x[len >> 5] |= 0x80 << (24 - (len & 0x1f));
        x[((len + 128 >> 10) << 5) + 31] = len;
        l = x.length;
        for (i = 0; i < l; i += 32) { //32 dwords is the block size
          int64copy(a, H[0]);
          int64copy(b, H[1]);
          int64copy(c, H[2]);
          int64copy(d, H[3]);
          int64copy(e, H[4]);
          int64copy(f, H[5]);
          int64copy(g, H[6]);
          int64copy(h, H[7]);

          for (j = 0; j < 16; j += 1) {
            W[j].h = x[i + 2 * j];
            W[j].l = x[i + 2 * j + 1];
          }

          for (j = 16; j < 80; j += 1) {
            //sigma1
            int64rrot(r1, W[j - 2], 19);
            int64revrrot(r2, W[j - 2], 29);
            int64shr(r3, W[j - 2], 6);
            s1.l = r1.l ^ r2.l ^ r3.l;
            s1.h = r1.h ^ r2.h ^ r3.h;
            //sigma0
            int64rrot(r1, W[j - 15], 1);
            int64rrot(r2, W[j - 15], 8);
            int64shr(r3, W[j - 15], 7);
            s0.l = r1.l ^ r2.l ^ r3.l;
            s0.h = r1.h ^ r2.h ^ r3.h;

            int64add4(W[j], s1, W[j - 7], s0, W[j - 16]);
          }

          for (j = 0; j < 80; j += 1) {
            //Ch
            Ch.l = (e.l & f.l) ^ (~e.l & g.l);
            Ch.h = (e.h & f.h) ^ (~e.h & g.h);

            //Sigma1
            int64rrot(r1, e, 14);
            int64rrot(r2, e, 18);
            int64revrrot(r3, e, 9);
            s1.l = r1.l ^ r2.l ^ r3.l;
            s1.h = r1.h ^ r2.h ^ r3.h;

            //Sigma0
            int64rrot(r1, a, 28);
            int64revrrot(r2, a, 2);
            int64revrrot(r3, a, 7);
            s0.l = r1.l ^ r2.l ^ r3.l;
            s0.h = r1.h ^ r2.h ^ r3.h;

            //Maj
            Maj.l = (a.l & b.l) ^ (a.l & c.l) ^ (b.l & c.l);
            Maj.h = (a.h & b.h) ^ (a.h & c.h) ^ (b.h & c.h);

            int64add5(T1, h, s1, Ch, sha512_k[j], W[j]);
            int64add(T2, s0, Maj);

            int64copy(h, g);
            int64copy(g, f);
            int64copy(f, e);
            int64add(e, d, T1);
            int64copy(d, c);
            int64copy(c, b);
            int64copy(b, a);
            int64add(a, T1, T2);
          }
          int64add(H[0], H[0], a);
          int64add(H[1], H[1], b);
          int64add(H[2], H[2], c);
          int64add(H[3], H[3], d);
          int64add(H[4], H[4], e);
          int64add(H[5], H[5], f);
          int64add(H[6], H[6], g);
          int64add(H[7], H[7], h);
        }

        //represent the hash as an array of 32-bit dwords
        for (i = 0; i < 8; i += 1) {
          hash[2 * i] = H[i].h;
          hash[2 * i + 1] = H[i].l;
        }
        return hash;
      }

      //A constructor for 64-bit numbers

      function int64(h, l) {
        this.h = h;
        this.l = l;
        //this.toString = int64toString;
      }

      //Copies src into dst, assuming both are 64-bit numbers

      function int64copy(dst, src) {
        dst.h = src.h;
        dst.l = src.l;
      }

      //Right-rotates a 64-bit number by shift
      //Won't handle cases of shift>=32
      //The function revrrot() is for that

      function int64rrot(dst, x, shift) {
        dst.l = (x.l >>> shift) | (x.h << (32 - shift));
        dst.h = (x.h >>> shift) | (x.l << (32 - shift));
      }

      //Reverses the dwords of the source and then rotates right by shift.
      //This is equivalent to rotation by 32+shift

      function int64revrrot(dst, x, shift) {
        dst.l = (x.h >>> shift) | (x.l << (32 - shift));
        dst.h = (x.l >>> shift) | (x.h << (32 - shift));
      }

      //Bitwise-shifts right a 64-bit number by shift
      //Won't handle shift>=32, but it's never needed in SHA512

      function int64shr(dst, x, shift) {
        dst.l = (x.l >>> shift) | (x.h << (32 - shift));
        dst.h = (x.h >>> shift);
      }

      //Adds two 64-bit numbers
      //Like the original implementation, does not rely on 32-bit operations

      function int64add(dst, x, y) {
        var w0 = (x.l & 0xffff) + (y.l & 0xffff);
        var w1 = (x.l >>> 16) + (y.l >>> 16) + (w0 >>> 16);
        var w2 = (x.h & 0xffff) + (y.h & 0xffff) + (w1 >>> 16);
        var w3 = (x.h >>> 16) + (y.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
      }

      //Same, except with 4 addends. Works faster than adding them one by one.

      function int64add4(dst, a, b, c, d) {
        var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff);
        var w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (w0 >>> 16);
        var w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (w1 >>> 16);
        var w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
      }

      //Same, except with 5 addends

      function int64add5(dst, a, b, c, d, e) {
        var w0 = (a.l & 0xffff) + (b.l & 0xffff) + (c.l & 0xffff) + (d.l & 0xffff) + (e.l & 0xffff),
          w1 = (a.l >>> 16) + (b.l >>> 16) + (c.l >>> 16) + (d.l >>> 16) + (e.l >>> 16) + (w0 >>> 16),
          w2 = (a.h & 0xffff) + (b.h & 0xffff) + (c.h & 0xffff) + (d.h & 0xffff) + (e.h & 0xffff) + (w1 >>> 16),
          w3 = (a.h >>> 16) + (b.h >>> 16) + (c.h >>> 16) + (d.h >>> 16) + (e.h >>> 16) + (w2 >>> 16);
        dst.l = (w0 & 0xffff) | (w1 << 16);
        dst.h = (w2 & 0xffff) | (w3 << 16);
      }
    },
    /**
     * @class Hashes.RMD160
     * @constructor
     * @param {Object} [config]
     *
     * A JavaScript implementation of the RIPEMD-160 Algorithm
     * Version 2.2 Copyright Jeremy Lin, Paul Johnston 2000 - 2009.
     * Other contributors: Greg Holt, Andrew Kepert, Ydnar, Lostinet
     * See http://pajhome.org.uk/crypt/md5 for details.
     * Also http://www.ocf.berkeley.edu/~jjlin/jsotp/
     */
    RMD160: function(options) {
      /**
       * Private properties configuration variables. You may need to tweak these to be compatible with
       * the server-side, but the defaults work in most cases.
       * @see this.setUpperCase() method
       * @see this.setPad() method
       */
      var hexcase = (options && typeof options.uppercase === 'boolean') ? options.uppercase : false,
        /* hexadecimal output case format. false - lowercase; true - uppercase  */
        b64pad = (options && typeof options.pad === 'string') ? options.pa : '=',
        /* base-64 pad character. Default '=' for strict RFC compliance   */
        utf8 = (options && typeof options.utf8 === 'boolean') ? options.utf8 : true,
        /* enable/disable utf8 encoding */
        rmd160_r1 = [
          0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
          7, 4, 13, 1, 10, 6, 15, 3, 12, 0, 9, 5, 2, 14, 11, 8,
          3, 10, 14, 4, 9, 15, 8, 1, 2, 7, 0, 6, 13, 11, 5, 12,
          1, 9, 11, 10, 0, 8, 12, 4, 13, 3, 7, 15, 14, 5, 6, 2,
          4, 0, 5, 9, 7, 12, 2, 10, 14, 1, 3, 8, 11, 6, 15, 13
        ],
        rmd160_r2 = [
          5, 14, 7, 0, 9, 2, 11, 4, 13, 6, 15, 8, 1, 10, 3, 12,
          6, 11, 3, 7, 0, 13, 5, 10, 14, 15, 8, 12, 4, 9, 1, 2,
          15, 5, 1, 3, 7, 14, 6, 9, 11, 8, 12, 2, 10, 0, 4, 13,
          8, 6, 4, 1, 3, 11, 15, 0, 5, 12, 2, 13, 9, 7, 10, 14,
          12, 15, 10, 4, 1, 5, 8, 7, 6, 2, 13, 14, 0, 3, 9, 11
        ],
        rmd160_s1 = [
          11, 14, 15, 12, 5, 8, 7, 9, 11, 13, 14, 15, 6, 7, 9, 8,
          7, 6, 8, 13, 11, 9, 7, 15, 7, 12, 15, 9, 11, 7, 13, 12,
          11, 13, 6, 7, 14, 9, 13, 15, 14, 8, 13, 6, 5, 12, 7, 5,
          11, 12, 14, 15, 14, 15, 9, 8, 9, 14, 5, 6, 8, 6, 5, 12,
          9, 15, 5, 11, 6, 8, 13, 12, 5, 12, 13, 14, 11, 8, 5, 6
        ],
        rmd160_s2 = [
          8, 9, 9, 11, 13, 15, 15, 5, 7, 7, 8, 11, 14, 14, 12, 6,
          9, 13, 15, 7, 12, 8, 9, 11, 7, 7, 12, 7, 6, 15, 13, 11,
          9, 7, 15, 11, 8, 6, 6, 14, 12, 13, 5, 14, 13, 13, 7, 5,
          15, 5, 8, 11, 14, 14, 6, 14, 6, 9, 12, 9, 12, 5, 15, 8,
          8, 5, 12, 9, 12, 5, 14, 6, 8, 13, 6, 5, 15, 13, 11, 11
        ];

      /* privileged (public) methods */
      this.hex = function(s) {
        return rstr2hex(rstr(s, utf8));
      };
      this.b64 = function(s) {
        return rstr2b64(rstr(s, utf8), b64pad);
      };
      this.any = function(s, e) {
        return rstr2any(rstr(s, utf8), e);
      };
      this.raw = function(s) {
        return rstr(s, utf8);
      };
      this.hex_hmac = function(k, d) {
        return rstr2hex(rstr_hmac(k, d));
      };
      this.b64_hmac = function(k, d) {
        return rstr2b64(rstr_hmac(k, d), b64pad);
      };
      this.any_hmac = function(k, d, e) {
        return rstr2any(rstr_hmac(k, d), e);
      };
      /**
       * Perform a simple self-test to see if the VM is working
       * @return {String} Hexadecimal hash sample
       * @public
       */
      this.vm_test = function() {
        return hex('abc').toLowerCase() === '900150983cd24fb0d6963f7d28e17f72';
      };
      /**
       * @description Enable/disable uppercase hexadecimal returned string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUpperCase = function(a) {
        if (typeof a === 'boolean') {
          hexcase = a;
        }
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {string} Pad
       * @return {Object} this
       * @public
       */
      this.setPad = function(a) {
        if (typeof a !== 'undefined') {
          b64pad = a;
        }
        return this;
      };
      /**
       * @description Defines a base64 pad string
       * @param {boolean}
       * @return {Object} this
       * @public
       */
      this.setUTF8 = function(a) {
        if (typeof a === 'boolean') {
          utf8 = a;
        }
        return this;
      };

      /* private methods */

      /**
       * Calculate the rmd160 of a raw string
       */

      function rstr(s) {
        s = (utf8) ? utf8Encode(s) : s;
        return binl2rstr(binl(rstr2binl(s), s.length * 8));
      }

      /**
       * Calculate the HMAC-rmd160 of a key and some data (raw strings)
       */

      function rstr_hmac(key, data) {
        key = (utf8) ? utf8Encode(key) : key;
        data = (utf8) ? utf8Encode(data) : data;
        var i, hash,
          bkey = rstr2binl(key),
          ipad = Array(16),
          opad = Array(16);

        if (bkey.length > 16) {
          bkey = binl(bkey, key.length * 8);
        }

        for (i = 0; i < 16; i += 1) {
          ipad[i] = bkey[i] ^ 0x36363636;
          opad[i] = bkey[i] ^ 0x5C5C5C5C;
        }
        hash = binl(ipad.concat(rstr2binl(data)), 512 + data.length * 8);
        return binl2rstr(binl(opad.concat(hash), 512 + 160));
      }

      /**
       * Convert an array of little-endian words to a string
       */

      function binl2rstr(input) {
        var i, output = '',
          l = input.length * 32;
        for (i = 0; i < l; i += 8) {
          output += String.fromCharCode((input[i >> 5] >>> (i % 32)) & 0xFF);
        }
        return output;
      }

      /**
       * Calculate the RIPE-MD160 of an array of little-endian words, and a bit length.
       */

      function binl(x, len) {
        var T, j, i, l,
          h0 = 0x67452301,
          h1 = 0xefcdab89,
          h2 = 0x98badcfe,
          h3 = 0x10325476,
          h4 = 0xc3d2e1f0,
          A1, B1, C1, D1, E1,
          A2, B2, C2, D2, E2;

        /* append padding */
        x[len >> 5] |= 0x80 << (len % 32);
        x[(((len + 64) >>> 9) << 4) + 14] = len;
        l = x.length;

        for (i = 0; i < l; i += 16) {
          A1 = A2 = h0;
          B1 = B2 = h1;
          C1 = C2 = h2;
          D1 = D2 = h3;
          E1 = E2 = h4;
          for (j = 0; j <= 79; j += 1) {
            T = safe_add(A1, rmd160_f(j, B1, C1, D1));
            T = safe_add(T, x[i + rmd160_r1[j]]);
            T = safe_add(T, rmd160_K1(j));
            T = safe_add(bit_rol(T, rmd160_s1[j]), E1);
            A1 = E1;
            E1 = D1;
            D1 = bit_rol(C1, 10);
            C1 = B1;
            B1 = T;
            T = safe_add(A2, rmd160_f(79 - j, B2, C2, D2));
            T = safe_add(T, x[i + rmd160_r2[j]]);
            T = safe_add(T, rmd160_K2(j));
            T = safe_add(bit_rol(T, rmd160_s2[j]), E2);
            A2 = E2;
            E2 = D2;
            D2 = bit_rol(C2, 10);
            C2 = B2;
            B2 = T;
          }

          T = safe_add(h1, safe_add(C1, D2));
          h1 = safe_add(h2, safe_add(D1, E2));
          h2 = safe_add(h3, safe_add(E1, A2));
          h3 = safe_add(h4, safe_add(A1, B2));
          h4 = safe_add(h0, safe_add(B1, C2));
          h0 = T;
        }
        return [h0, h1, h2, h3, h4];
      }

      // specific algorithm methods

      function rmd160_f(j, x, y, z) {
        return (0 <= j && j <= 15) ? (x ^ y ^ z) :
          (16 <= j && j <= 31) ? (x & y) | (~x & z) :
          (32 <= j && j <= 47) ? (x | ~y) ^ z :
          (48 <= j && j <= 63) ? (x & z) | (y & ~z) :
          (64 <= j && j <= 79) ? x ^ (y | ~z) :
          'rmd160_f: j out of range';
      }

      function rmd160_K1(j) {
        return (0 <= j && j <= 15) ? 0x00000000 :
          (16 <= j && j <= 31) ? 0x5a827999 :
          (32 <= j && j <= 47) ? 0x6ed9eba1 :
          (48 <= j && j <= 63) ? 0x8f1bbcdc :
          (64 <= j && j <= 79) ? 0xa953fd4e :
          'rmd160_K1: j out of range';
      }

      function rmd160_K2(j) {
        return (0 <= j && j <= 15) ? 0x50a28be6 :
          (16 <= j && j <= 31) ? 0x5c4dd124 :
          (32 <= j && j <= 47) ? 0x6d703ef3 :
          (48 <= j && j <= 63) ? 0x7a6d76e9 :
          (64 <= j && j <= 79) ? 0x00000000 :
          'rmd160_K2: j out of range';
      }
    }
  };

  // exposes Hashes
  (function(window, undefined) {
    var freeExports = false;
    if (typeof exports === 'object') {
      freeExports = exports;
      if (exports && typeof global === 'object' && global && global === global.global) {
        window = global;
      }
    }

    if (typeof define === 'function' && typeof define.amd === 'object' && define.amd) {
      // define as an anonymous module, so, through path mapping, it can be aliased
      define(function() {
        return Hashes;
      });
    } else if (freeExports) {
      // in Node.js or RingoJS v0.8.0+
      if (typeof module === 'object' && module && module.exports === freeExports) {
        module.exports = Hashes;
      }
      // in Narwhal or RingoJS v0.7.0-
      else {
        freeExports.Hashes = Hashes;
      }
    } else {
      // in a browser or Rhino
      window.Hashes = Hashes;
    }
  }(this));
}()); // IIFE

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],2:[function(require,module,exports){
'use strict';

var hashes = require('jshashes'),
    xtend = require('xtend'),
    sha1 = new hashes.SHA1();

var ohauth = {};

ohauth.qsString = function(obj) {
    return Object.keys(obj).sort().map(function(key) {
        return ohauth.percentEncode(key) + '=' +
            ohauth.percentEncode(obj[key]);
    }).join('&');
};

ohauth.stringQs = function(str) {
    return str.split('&').filter(function (pair) {
        return pair !== '';
    }).reduce(function(obj, pair){
        var parts = pair.split('=');
        obj[decodeURIComponent(parts[0])] = (null === parts[1]) ?
            '' : decodeURIComponent(parts[1]);
        return obj;
    }, {});
};

ohauth.rawxhr = function(method, url, data, headers, callback) {
    var xhr = new XMLHttpRequest(),
        twoHundred = /^20\d$/;
    xhr.onreadystatechange = function() {
        if (4 === xhr.readyState && 0 !== xhr.status) {
            if (twoHundred.test(xhr.status)) callback(null, xhr);
            else return callback(xhr, null);
        }
    };
    xhr.onerror = function(e) { return callback(e, null); };
    xhr.open(method, url, true);
    for (var h in headers) xhr.setRequestHeader(h, headers[h]);
    xhr.send(data);
    return xhr;
};

ohauth.xhr = function(method, url, auth, data, options, callback) {
    var headers = (options && options.header) || {
        'Content-Type': 'application/x-www-form-urlencoded'
    };
    headers.Authorization = 'OAuth ' + ohauth.authHeader(auth);
    return ohauth.rawxhr(method, url, data, headers, callback);
};

ohauth.nonce = function() {
    for (var o = ''; o.length < 6;) {
        o += '0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz'[Math.floor(Math.random() * 61)];
    }
    return o;
};

ohauth.authHeader = function(obj) {
    return Object.keys(obj).sort().map(function(key) {
        return encodeURIComponent(key) + '="' + encodeURIComponent(obj[key]) + '"';
    }).join(', ');
};

ohauth.timestamp = function() { return ~~((+new Date()) / 1000); };

ohauth.percentEncode = function(s) {
    return encodeURIComponent(s)
        .replace(/\!/g, '%21').replace(/\'/g, '%27')
        .replace(/\*/g, '%2A').replace(/\(/g, '%28').replace(/\)/g, '%29');
};

ohauth.baseString = function(method, url, params) {
    if (params.oauth_signature) delete params.oauth_signature;
    return [
        method,
        ohauth.percentEncode(url),
        ohauth.percentEncode(ohauth.qsString(params))].join('&');
};

ohauth.signature = function(oauth_secret, token_secret, baseString) {
    return sha1.b64_hmac(
        ohauth.percentEncode(oauth_secret) + '&' +
        ohauth.percentEncode(token_secret),
        baseString);
};

/**
 * Takes an options object for configuration (consumer_key,
 * consumer_secret, version, signature_method, token, token_secret)
 * and returns a function that generates the Authorization header
 * for given data.
 *
 * The returned function takes these parameters:
 * - method: GET/POST/...
 * - uri: full URI with protocol, port, path and query string
 * - extra_params: any extra parameters (that are passed in the POST data),
 *   can be an object or a from-urlencoded string.
 *
 * Returned function returns full OAuth header with "OAuth" string in it.
 */

ohauth.headerGenerator = function(options) {
    options = options || {};
    var consumer_key = options.consumer_key || '',
        consumer_secret = options.consumer_secret || '',
        signature_method = options.signature_method || 'HMAC-SHA1',
        version = options.version || '1.0',
        token = options.token || '',
        token_secret = options.token_secret || '';

    return function(method, uri, extra_params) {
        method = method.toUpperCase();
        if (typeof extra_params === 'string' && extra_params.length > 0) {
            extra_params = ohauth.stringQs(extra_params);
        }

        var uri_parts = uri.split('?', 2),
        base_uri = uri_parts[0];

        var query_params = uri_parts.length === 2 ?
            ohauth.stringQs(uri_parts[1]) : {};

        var oauth_params = {
            oauth_consumer_key: consumer_key,
            oauth_signature_method: signature_method,
            oauth_version: version,
            oauth_timestamp: ohauth.timestamp(),
            oauth_nonce: ohauth.nonce()
        };

        if (token) oauth_params.oauth_token = token;

        var all_params = xtend({}, oauth_params, query_params, extra_params),
            base_str = ohauth.baseString(method, base_uri, all_params);

        oauth_params.oauth_signature = ohauth.signature(consumer_secret, token_secret, base_str);

        return 'OAuth ' + ohauth.authHeader(oauth_params);
    };
};

module.exports = ohauth;

},{"jshashes":1,"xtend":18}],3:[function(require,module,exports){
'use strict';

var ohauth = require('ohauth');
var resolveUrl = require('resolve-url');
var store = require('store');
var xtend = require('xtend');


// # osm-auth
//
// This code is only compatible with IE10+ because the [XDomainRequest](http://bit.ly/LfO7xo)
// object, IE<10's idea of [CORS](http://en.wikipedia.org/wiki/Cross-origin_resource_sharing),
// does not support custom headers, which this uses everywhere.
module.exports = function(o) {

    var oauth = {};

    // authenticated users will also have a request token secret, but it's
    // not used in transactions with the server
    oauth.authenticated = function() {
        return !!(token('oauth_token') && token('oauth_token_secret'));
    };

    oauth.logout = function() {
        token('oauth_token', '');
        token('oauth_token_secret', '');
        token('oauth_request_token_secret', '');
        return oauth;
    };

    // TODO: detect lack of click event
    oauth.authenticate = function(callback) {
        if (oauth.authenticated()) return callback();

        oauth.logout();

        // ## Getting a request token
        var params = timenonce(getAuth(o)),
            url = o.url + '/oauth/request_token';

        params.oauth_signature = ohauth.signature(
            o.oauth_secret, '',
            ohauth.baseString('POST', url, params));

        if (!o.singlepage) {
            // Create a 600x550 popup window in the center of the screen
            var w = 600, h = 550,
                settings = [
                    ['width', w], ['height', h],
                    ['left', screen.width / 2 - w / 2],
                    ['top', screen.height / 2 - h / 2]].map(function(x) {
                        return x.join('=');
                    }).join(','),
                popup = window.open('about:blank', 'oauth_window', settings);
        }

        // Request a request token. When this is complete, the popup
        // window is redirected to OSM's authorization page.
        ohauth.xhr('POST', url, params, null, {}, reqTokenDone);
        o.loading();

        function reqTokenDone(err, xhr) {
            o.done();
            if (err) return callback(err);
            var resp = ohauth.stringQs(xhr.response);
            token('oauth_request_token_secret', resp.oauth_token_secret);
            var authorize_url = o.url + '/oauth/authorize?' + ohauth.qsString({
                oauth_token: resp.oauth_token,
                oauth_callback: resolveUrl(o.landing)
            });

            if (o.singlepage) {
                location.href = authorize_url;
            } else {
                popup.location = authorize_url;
            }
        }

        // Called by a function in a landing page, in the popup window. The
        // window closes itself.
        window.authComplete = function(token) {
            var oauth_token = ohauth.stringQs(token.split('?')[1]);
            get_access_token(oauth_token.oauth_token);
            delete window.authComplete;
        };

        // ## Getting an request token
        //
        // At this point we have an `oauth_token`, brought in from a function
        // call on a landing page popup.
        function get_access_token(oauth_token) {
            var url = o.url + '/oauth/access_token',
                params = timenonce(getAuth(o)),
                request_token_secret = token('oauth_request_token_secret');
            params.oauth_token = oauth_token;
            params.oauth_signature = ohauth.signature(
                o.oauth_secret,
                request_token_secret,
                ohauth.baseString('POST', url, params));

            // ## Getting an access token
            //
            // The final token required for authentication. At this point
            // we have a `request token secret`
            ohauth.xhr('POST', url, params, null, {}, accessTokenDone);
            o.loading();
        }

        function accessTokenDone(err, xhr) {
            o.done();
            if (err) return callback(err);
            var access_token = ohauth.stringQs(xhr.response);
            token('oauth_token', access_token.oauth_token);
            token('oauth_token_secret', access_token.oauth_token_secret);
            callback(null, oauth);
        }
    };

    oauth.bootstrapToken = function(oauth_token, callback) {
        // ## Getting an request token
        // At this point we have an `oauth_token`, brought in from a function
        // call on a landing page popup.
        function get_access_token(oauth_token) {
            var url = o.url + '/oauth/access_token',
                params = timenonce(getAuth(o)),
                request_token_secret = token('oauth_request_token_secret');
            params.oauth_token = oauth_token;
            params.oauth_signature = ohauth.signature(
                o.oauth_secret,
                request_token_secret,
                ohauth.baseString('POST', url, params));

            // ## Getting an access token
            // The final token required for authentication. At this point
            // we have a `request token secret`
            ohauth.xhr('POST', url, params, null, {}, accessTokenDone);
            o.loading();
        }

        function accessTokenDone(err, xhr) {
            o.done();
            if (err) return callback(err);
            var access_token = ohauth.stringQs(xhr.response);
            token('oauth_token', access_token.oauth_token);
            token('oauth_token_secret', access_token.oauth_token_secret);
            callback(null, oauth);
        }

        get_access_token(oauth_token);
    };

    // # xhr
    //
    // A single XMLHttpRequest wrapper that does authenticated calls if the
    // user has logged in.
    oauth.xhr = function(options, callback) {
        if (!oauth.authenticated()) {
            if (o.auto) {
                return oauth.authenticate(run);
            } else {
                callback('not authenticated', null);
                return;
            }
        } else {
            return run();
        }

        function run() {
            var params = timenonce(getAuth(o)),
                oauth_token_secret = token('oauth_token_secret'),
                url = (options.prefix !== false) ? o.url + options.path : options.path,
                url_parts = url.replace(/#.*$/, '').split('?', 2),
                base_url = url_parts[0],
                query = (url_parts.length === 2) ? url_parts[1] : '';

            // https://tools.ietf.org/html/rfc5849#section-3.4.1.3.1
            if ((!options.options || !options.options.header ||
                options.options.header['Content-Type'] === 'application/x-www-form-urlencoded') &&
                options.content) {
                params = xtend(params, ohauth.stringQs(options.content));
            }

            params.oauth_token = token('oauth_token');
            params.oauth_signature = ohauth.signature(
                o.oauth_secret,
                oauth_token_secret,
                ohauth.baseString(options.method, base_url, xtend(params, ohauth.stringQs(query)))
            );

            return ohauth.xhr(options.method, url, params, options.content, options.options, done);
        }

        function done(err, xhr) {
            if (err) return callback(err);
            else if (xhr.responseXML) return callback(err, xhr.responseXML);
            else return callback(err, xhr.response);
        }
    };

    // pre-authorize this object, if we can just get a token and token_secret
    // from the start
    oauth.preauth = function(c) {
        if (!c) return;
        if (c.oauth_token) token('oauth_token', c.oauth_token);
        if (c.oauth_token_secret) token('oauth_token_secret', c.oauth_token_secret);
        return oauth;
    };

    oauth.options = function(_) {
        if (!arguments.length) return o;

        o = _;
        o.url = o.url || 'https://www.openstreetmap.org';
        o.landing = o.landing || 'land.html';
        o.singlepage = o.singlepage || false;

        // Optional loading and loading-done functions for nice UI feedback.
        // by default, no-ops
        o.loading = o.loading || function() {};
        o.done = o.done || function() {};

        return oauth.preauth(o);
    };

    // 'stamp' an authentication object from `getAuth()`
    // with a [nonce](http://en.wikipedia.org/wiki/Cryptographic_nonce)
    // and timestamp
    function timenonce(o) {
        o.oauth_timestamp = ohauth.timestamp();
        o.oauth_nonce = ohauth.nonce();
        return o;
    }

    // get/set tokens. These are prefixed with the base URL so that `osm-auth`
    // can be used with multiple APIs and the keys in `localStorage`
    // will not clash
    var token;

    if (store.enabled) {
        token = function (x, y) {
            if (arguments.length === 1) return store.get(o.url + x);
            else if (arguments.length === 2) return store.set(o.url + x, y);
        };
    } else {
        var storage = {};
        token = function (x, y) {
            if (arguments.length === 1) return storage[o.url + x];
            else if (arguments.length === 2) return storage[o.url + x] = y;
        };
    }

    // Get an authentication object. If you just add and remove properties
    // from a single object, you'll need to use `delete` to make sure that
    // it doesn't contain undesired properties for authentication
    function getAuth(o) {
        return {
            oauth_consumer_key: o.oauth_consumer_key,
            oauth_signature_method: 'HMAC-SHA1'
        };
    }

    // potentially pre-authorize
    oauth.options(o);

    return oauth;
};

},{"ohauth":2,"resolve-url":5,"store":6,"xtend":18}],4:[function(require,module,exports){
!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.OsmRequest=e():t.OsmRequest=e()}("undefined"!=typeof self?self:this,function(){return function(t){function e(r){if(n[r])return n[r].exports;var i=n[r]={i:r,l:!1,exports:{}};return t[r].call(i.exports,i,i.exports,e),i.l=!0,i.exports}var n={};return e.m=t,e.c=n,e.d=function(t,n,r){e.o(t,n)||Object.defineProperty(t,n,{configurable:!1,enumerable:!0,get:r})},e.n=function(t){var n=t&&t.__esModule?function(){return t.default}:function(){return t};return e.d(n,"a",n),n},e.o=function(t,e){return Object.prototype.hasOwnProperty.call(t,e)},e.p="",e(e.s=41)}([function(t,e,n){(function(){var e,r,i,o,s,a,u,c,h,l,f,p,d={}.hasOwnProperty;p=n(2),f=p.isObject,l=p.isFunction,h=p.isEmpty,s=null,e=null,r=null,i=null,o=null,u=null,c=null,a=null,t.exports=function(){function t(t){this.parent=t,this.parent&&(this.options=this.parent.options,this.stringify=this.parent.stringify),this.children=[],s||(s=n(7),e=n(8),r=n(9),i=n(10),o=n(11),u=n(16),c=n(17),a=n(18))}return t.prototype.element=function(t,e,n){var r,i,o,s,a,u,c,p,y,g;if(u=null,null==e&&(e={}),e=e.valueOf(),f(e)||(y=[e,n],n=y[0],e=y[1]),null!=t&&(t=t.valueOf()),Array.isArray(t))for(o=0,c=t.length;o<c;o++)i=t[o],u=this.element(i);else if(l(t))u=this.element(t.apply());else if(f(t)){for(a in t)if(d.call(t,a))if(g=t[a],l(g)&&(g=g.apply()),f(g)&&h(g)&&(g=null),!this.options.ignoreDecorators&&this.stringify.convertAttKey&&0===a.indexOf(this.stringify.convertAttKey))u=this.attribute(a.substr(this.stringify.convertAttKey.length),g);else if(!this.options.separateArrayItems&&Array.isArray(g))for(s=0,p=g.length;s<p;s++)i=g[s],r={},r[a]=i,u=this.element(r);else f(g)?(u=this.element(a),u.element(g)):u=this.element(a,g)}else u=!this.options.ignoreDecorators&&this.stringify.convertTextKey&&0===t.indexOf(this.stringify.convertTextKey)?this.text(n):!this.options.ignoreDecorators&&this.stringify.convertCDataKey&&0===t.indexOf(this.stringify.convertCDataKey)?this.cdata(n):!this.options.ignoreDecorators&&this.stringify.convertCommentKey&&0===t.indexOf(this.stringify.convertCommentKey)?this.comment(n):!this.options.ignoreDecorators&&this.stringify.convertRawKey&&0===t.indexOf(this.stringify.convertRawKey)?this.raw(n):!this.options.ignoreDecorators&&this.stringify.convertPIKey&&0===t.indexOf(this.stringify.convertPIKey)?this.instruction(t.substr(this.stringify.convertPIKey.length),n):this.node(t,e,n);if(null==u)throw new Error("Could not create any elements with: "+t);return u},t.prototype.insertBefore=function(t,e,n){var r,i,o;if(this.isRoot)throw new Error("Cannot insert elements at root level");return i=this.parent.children.indexOf(this),o=this.parent.children.splice(i),r=this.parent.element(t,e,n),Array.prototype.push.apply(this.parent.children,o),r},t.prototype.insertAfter=function(t,e,n){var r,i,o;if(this.isRoot)throw new Error("Cannot insert elements at root level");return i=this.parent.children.indexOf(this),o=this.parent.children.splice(i+1),r=this.parent.element(t,e,n),Array.prototype.push.apply(this.parent.children,o),r},t.prototype.remove=function(){var t;if(this.isRoot)throw new Error("Cannot remove the root element");return t=this.parent.children.indexOf(this),[].splice.apply(this.parent.children,[t,t-t+1].concat([])),this.parent},t.prototype.node=function(t,e,n){var r,i;return null!=t&&(t=t.valueOf()),e||(e={}),e=e.valueOf(),f(e)||(i=[e,n],n=i[0],e=i[1]),r=new s(this,t,e),null!=n&&r.text(n),this.children.push(r),r},t.prototype.text=function(t){var e;return e=new c(this,t),this.children.push(e),this},t.prototype.cdata=function(t){var n;return n=new e(this,t),this.children.push(n),this},t.prototype.comment=function(t){var e;return e=new r(this,t),this.children.push(e),this},t.prototype.commentBefore=function(t){var e,n;return e=this.parent.children.indexOf(this),n=this.parent.children.splice(e),this.parent.comment(t),Array.prototype.push.apply(this.parent.children,n),this},t.prototype.commentAfter=function(t){var e,n;return e=this.parent.children.indexOf(this),n=this.parent.children.splice(e+1),this.parent.comment(t),Array.prototype.push.apply(this.parent.children,n),this},t.prototype.raw=function(t){var e;return e=new u(this,t),this.children.push(e),this},t.prototype.instruction=function(t,e){var n,r,i,o,s;if(null!=t&&(t=t.valueOf()),null!=e&&(e=e.valueOf()),Array.isArray(t))for(o=0,s=t.length;o<s;o++)n=t[o],this.instruction(n);else if(f(t))for(n in t)d.call(t,n)&&(r=t[n],this.instruction(n,r));else l(e)&&(e=e.apply()),i=new a(this,t,e),this.children.push(i);return this},t.prototype.instructionBefore=function(t,e){var n,r;return n=this.parent.children.indexOf(this),r=this.parent.children.splice(n),this.parent.instruction(t,e),Array.prototype.push.apply(this.parent.children,r),this},t.prototype.instructionAfter=function(t,e){var n,r;return n=this.parent.children.indexOf(this),r=this.parent.children.splice(n+1),this.parent.instruction(t,e),Array.prototype.push.apply(this.parent.children,r),this},t.prototype.declaration=function(t,e,n){var r,o;return r=this.document(),o=new i(r,t,e,n),r.children[0]instanceof i?r.children[0]=o:r.children.unshift(o),r.root()||r},t.prototype.doctype=function(t,e){var n,r,i,s,a,u,c,h,l,f;for(r=this.document(),i=new o(r,t,e),l=r.children,s=a=0,c=l.length;a<c;s=++a)if((n=l[s])instanceof o)return r.children[s]=i,i;for(f=r.children,s=u=0,h=f.length;u<h;s=++u)if(n=f[s],n.isRoot)return r.children.splice(s,0,i),i;return r.children.push(i),i},t.prototype.up=function(){if(this.isRoot)throw new Error("The root node has no parent. Use doc() if you need to get the document object.");return this.parent},t.prototype.root=function(){var t;for(t=this;t;){if(t.isDocument)return t.rootObject;if(t.isRoot)return t;t=t.parent}},t.prototype.document=function(){var t;for(t=this;t;){if(t.isDocument)return t;t=t.parent}},t.prototype.end=function(t){return this.document().end(t)},t.prototype.prev=function(){var t;if((t=this.parent.children.indexOf(this))<1)throw new Error("Already at the first node");return this.parent.children[t-1]},t.prototype.next=function(){var t;if(-1===(t=this.parent.children.indexOf(this))||t===this.parent.children.length-1)throw new Error("Already at the last node");return this.parent.children[t+1]},t.prototype.importDocument=function(t){var e;return e=t.root().clone(),e.parent=this,e.isRoot=!1,this.children.push(e),this},t.prototype.ele=function(t,e,n){return this.element(t,e,n)},t.prototype.nod=function(t,e,n){return this.node(t,e,n)},t.prototype.txt=function(t){return this.text(t)},t.prototype.dat=function(t){return this.cdata(t)},t.prototype.com=function(t){return this.comment(t)},t.prototype.ins=function(t,e){return this.instruction(t,e)},t.prototype.doc=function(){return this.document()},t.prototype.dec=function(t,e,n){return this.declaration(t,e,n)},t.prototype.dtd=function(t,e){return this.doctype(t,e)},t.prototype.e=function(t,e,n){return this.element(t,e,n)},t.prototype.n=function(t,e,n){return this.node(t,e,n)},t.prototype.t=function(t){return this.text(t)},t.prototype.d=function(t){return this.cdata(t)},t.prototype.c=function(t){return this.comment(t)},t.prototype.r=function(t){return this.raw(t)},t.prototype.i=function(t,e){return this.instruction(t,e)},t.prototype.u=function(){return this.up()},t.prototype.importXMLBuilder=function(t){return this.importDocument(t)},t}()}).call(this)},function(t,e){var n;n=function(){return this}();try{n=n||Function("return this")()||(0,eval)("this")}catch(t){"object"==typeof window&&(n=window)}t.exports=n},function(t,e){(function(){var e,n,r,i,o,s,a=[].slice,u={}.hasOwnProperty;e=function(){var t,e,n,r,o,s;if(s=arguments[0],o=2<=arguments.length?a.call(arguments,1):[],i(Object.assign))Object.assign.apply(null,arguments);else for(t=0,n=o.length;t<n;t++)if(null!=(r=o[t]))for(e in r)u.call(r,e)&&(s[e]=r[e]);return s},i=function(t){return!!t&&"[object Function]"===Object.prototype.toString.call(t)},o=function(t){var e;return!!t&&("function"==(e=typeof t)||"object"===e)},n=function(t){return i(Array.isArray)?Array.isArray(t):"[object Array]"===Object.prototype.toString.call(t)},r=function(t){var e;if(n(t))return!t.length;for(e in t)if(u.call(t,e))return!1;return!0},s=function(t){var e,n;return o(t)&&(n=Object.getPrototypeOf(t))&&(e=n.constructor)&&"function"==typeof e&&e instanceof e&&Function.prototype.toString.call(e)===Function.prototype.toString.call(Object)},t.exports.assign=e,t.exports.isFunction=i,t.exports.isObject=o,t.exports.isArray=n,t.exports.isEmpty=r,t.exports.isPlainObject=s}).call(this)},function(t,e,n){"use strict";function r(t){if(!(this instanceof r))return new r(t);c.call(this,t),h.call(this,t),t&&!1===t.readable&&(this.readable=!1),t&&!1===t.writable&&(this.writable=!1),this.allowHalfOpen=!0,t&&!1===t.allowHalfOpen&&(this.allowHalfOpen=!1),this.once("end",i)}function i(){this.allowHalfOpen||this._writableState.ended||s(o,this)}function o(t){t.end()}var s=n(21).nextTick,a=Object.keys||function(t){var e=[];for(var n in t)e.push(n);return e};t.exports=r;var u=n(6);u.inherits=n(5);var c=n(35),h=n(27);u.inherits(r,c);for(var l=a(h.prototype),f=0;f<l.length;f++){var p=l[f];r.prototype[p]||(r.prototype[p]=h.prototype[p])}Object.defineProperty(r.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed&&this._writableState.destroyed)},set:function(t){void 0!==this._readableState&&void 0!==this._writableState&&(this._readableState.destroyed=t,this._writableState.destroyed=t)}}),r.prototype._destroy=function(t,e){this.push(null),this.end(),s(e,t)}},function(t,e,n){(function(e){function n(t,e){return function(){return e.apply(t,Array.prototype.slice.call(arguments,0))}}function r(t,e){return Array.prototype.slice.call(t,e||0)}function i(t,e){s(t,function(t,n){return e(t,n),!1})}function o(t,e){var n=a(t)?[]:{};return s(t,function(t,r){return n[r]=e(t,r),!1}),n}function s(t,e){if(a(t)){for(var n=0;n<t.length;n++)if(e(t[n],n))return t[n]}else for(var r in t)if(t.hasOwnProperty(r)&&e(t[r],r))return t[r]}function a(t){return null!=t&&"function"!=typeof t&&"number"==typeof t.length}function u(t){return t&&"[object Function]"==={}.toString.call(t)}function c(t){return t&&"[object Object]"==={}.toString.call(t)}var h=function(){return Object.assign?Object.assign:function(t,e,n,r){for(var o=1;o<arguments.length;o++)i(Object(arguments[o]),function(e,n){t[n]=e});return t}}(),l=function(){function t(){}return Object.create?function(t,e,n,i){var o=r(arguments,1);return h.apply(this,[Object.create(t)].concat(o))}:function(e,n,i,o){var s=r(arguments,1);return t.prototype=e,h.apply(this,[new t].concat(s))}}(),f=function(){return String.prototype.trim?function(t){return String.prototype.trim.call(t)}:function(t){return t.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,"")}}(),p="undefined"!=typeof window?window:e;t.exports={assign:h,create:l,trim:f,bind:n,slice:r,each:i,map:o,pluck:s,isList:a,isFunction:u,isObject:c,Global:p}}).call(e,n(1))},function(t,e){"function"==typeof Object.create?t.exports=function(t,e){t.super_=e,t.prototype=Object.create(e.prototype,{constructor:{value:t,enumerable:!1,writable:!0,configurable:!0}})}:t.exports=function(t,e){t.super_=e;var n=function(){};n.prototype=e.prototype,t.prototype=new n,t.prototype.constructor=t}},function(t,e,n){(function(t){function n(t){return Array.isArray?Array.isArray(t):"[object Array]"===g(t)}function r(t){return"boolean"==typeof t}function i(t){return null===t}function o(t){return null==t}function s(t){return"number"==typeof t}function a(t){return"string"==typeof t}function u(t){return"symbol"==typeof t}function c(t){return void 0===t}function h(t){return"[object RegExp]"===g(t)}function l(t){return"object"==typeof t&&null!==t}function f(t){return"[object Date]"===g(t)}function p(t){return"[object Error]"===g(t)||t instanceof Error}function d(t){return"function"==typeof t}function y(t){return null===t||"boolean"==typeof t||"number"==typeof t||"string"==typeof t||"symbol"==typeof t||void 0===t}function g(t){return Object.prototype.toString.call(t)}e.isArray=n,e.isBoolean=r,e.isNull=i,e.isNullOrUndefined=o,e.isNumber=s,e.isString=a,e.isSymbol=u,e.isUndefined=c,e.isRegExp=h,e.isObject=l,e.isDate=f,e.isError=p,e.isFunction=d,e.isPrimitive=y,e.isBuffer=t.isBuffer}).call(e,n(25).Buffer)},function(t,e,n){(function(){var e,r,i,o,s,a=function(t,e){function n(){this.constructor=t}for(var r in e)u.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},u={}.hasOwnProperty;s=n(2),o=s.isObject,i=s.isFunction,r=n(0),e=n(31),t.exports=function(t){function n(t,e,r){if(n.__super__.constructor.call(this,t),null==e)throw new Error("Missing element name");this.name=this.stringify.eleName(e),this.attributes={},null!=r&&this.attribute(r),t.isDocument&&(this.isRoot=!0,this.documentObject=t,t.rootObject=this)}return a(n,t),n.prototype.clone=function(){var t,e,n,r;n=Object.create(this),n.isRoot&&(n.documentObject=null),n.attributes={},r=this.attributes;for(e in r)u.call(r,e)&&(t=r[e],n.attributes[e]=t.clone());return n.children=[],this.children.forEach(function(t){var e;return e=t.clone(),e.parent=n,n.children.push(e)}),n},n.prototype.attribute=function(t,n){var r,s;if(null!=t&&(t=t.valueOf()),o(t))for(r in t)u.call(t,r)&&(s=t[r],this.attribute(r,s));else i(n)&&(n=n.apply()),this.options.skipNullAttributes&&null==n||(this.attributes[t]=new e(this,t,n));return this},n.prototype.removeAttribute=function(t){var e,n,r;if(null==t)throw new Error("Missing attribute name");if(t=t.valueOf(),Array.isArray(t))for(n=0,r=t.length;n<r;n++)e=t[n],delete this.attributes[e];else delete this.attributes[t];return this},n.prototype.toString=function(t){return this.options.writer.set(t).element(this)},n.prototype.att=function(t,e){return this.attribute(t,e)},n.prototype.a=function(t,e){return this.attribute(t,e)},n}(r)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing CDATA text");this.text=this.stringify.cdata(n)}return r(e,t),e.prototype.clone=function(){return Object.create(this)},e.prototype.toString=function(t){return this.options.writer.set(t).cdata(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing comment text");this.text=this.stringify.comment(n)}return r(e,t),e.prototype.clone=function(){return Object.create(this)},e.prototype.toString=function(t){return this.options.writer.set(t).comment(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r,i=function(t,e){function n(){this.constructor=t}for(var r in e)o.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},o={}.hasOwnProperty;r=n(2).isObject,e=n(0),t.exports=function(t){function e(t,n,i,o){var s;e.__super__.constructor.call(this,t),r(n)&&(s=n,n=s.version,i=s.encoding,o=s.standalone),n||(n="1.0"),this.version=this.stringify.xmlVersion(n),null!=i&&(this.encoding=this.stringify.xmlEncoding(i)),null!=o&&(this.standalone=this.stringify.xmlStandalone(o))}return i(e,t),e.prototype.toString=function(t){return this.options.writer.set(t).declaration(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r,i,o,s,a,u=function(t,e){function n(){this.constructor=t}for(var r in e)c.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},c={}.hasOwnProperty;a=n(2).isObject,s=n(0),e=n(12),i=n(13),r=n(14),o=n(15),t.exports=function(t){function n(t,e,r){var i,o;n.__super__.constructor.call(this,t),this.documentObject=t,a(e)&&(i=e,e=i.pubID,r=i.sysID),null==r&&(o=[e,r],r=o[0],e=o[1]),null!=e&&(this.pubID=this.stringify.dtdPubID(e)),null!=r&&(this.sysID=this.stringify.dtdSysID(r))}return u(n,t),n.prototype.element=function(t,e){var n;return n=new r(this,t,e),this.children.push(n),this},n.prototype.attList=function(t,n,r,i,o){var s;return s=new e(this,t,n,r,i,o),this.children.push(s),this},n.prototype.entity=function(t,e){var n;return n=new i(this,!1,t,e),this.children.push(n),this},n.prototype.pEntity=function(t,e){var n;return n=new i(this,!0,t,e),this.children.push(n),this},n.prototype.notation=function(t,e){var n;return n=new o(this,t,e),this.children.push(n),this},n.prototype.toString=function(t){return this.options.writer.set(t).docType(this)},n.prototype.ele=function(t,e){return this.element(t,e)},n.prototype.att=function(t,e,n,r,i){return this.attList(t,e,n,r,i)},n.prototype.ent=function(t,e){return this.entity(t,e)},n.prototype.pent=function(t,e){return this.pEntity(t,e)},n.prototype.not=function(t,e){return this.notation(t,e)},n.prototype.up=function(){return this.root()||this.documentObject},n}(s)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n,r,i,o,s){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing DTD element name");if(null==r)throw new Error("Missing DTD attribute name");if(!i)throw new Error("Missing DTD attribute type");if(!o)throw new Error("Missing DTD attribute default");if(0!==o.indexOf("#")&&(o="#"+o),!o.match(/^(#REQUIRED|#IMPLIED|#FIXED|#DEFAULT)$/))throw new Error("Invalid default value type; expected: #REQUIRED, #IMPLIED, #FIXED or #DEFAULT");if(s&&!o.match(/^(#FIXED|#DEFAULT)$/))throw new Error("Default value only applies to #FIXED or #DEFAULT");this.elementName=this.stringify.eleName(n),this.attributeName=this.stringify.attName(r),this.attributeType=this.stringify.dtdAttType(i),this.defaultValue=this.stringify.dtdAttDefault(s),this.defaultValueType=o}return r(e,t),e.prototype.toString=function(t){return this.options.writer.set(t).dtdAttList(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r,i=function(t,e){function n(){this.constructor=t}for(var r in e)o.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},o={}.hasOwnProperty;r=n(2).isObject,e=n(0),t.exports=function(t){function e(t,n,i,o){if(e.__super__.constructor.call(this,t),null==i)throw new Error("Missing entity name");if(null==o)throw new Error("Missing entity value");if(this.pe=!!n,this.name=this.stringify.eleName(i),r(o)){if(!o.pubID&&!o.sysID)throw new Error("Public and/or system identifiers are required for an external entity");if(o.pubID&&!o.sysID)throw new Error("System identifier is required for a public external entity");if(null!=o.pubID&&(this.pubID=this.stringify.dtdPubID(o.pubID)),null!=o.sysID&&(this.sysID=this.stringify.dtdSysID(o.sysID)),null!=o.nData&&(this.nData=this.stringify.dtdNData(o.nData)),this.pe&&this.nData)throw new Error("Notation declaration is not allowed in a parameter entity")}else this.value=this.stringify.dtdEntityValue(o)}return i(e,t),e.prototype.toString=function(t){return this.options.writer.set(t).dtdEntity(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n,r){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing DTD element name");r||(r="(#PCDATA)"),Array.isArray(r)&&(r="("+r.join(",")+")"),this.name=this.stringify.eleName(n),this.value=this.stringify.dtdElementValue(r)}return r(e,t),e.prototype.toString=function(t){return this.options.writer.set(t).dtdElement(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n,r){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing notation name");if(!r.pubID&&!r.sysID)throw new Error("Public or system identifiers are required for an external entity");this.name=this.stringify.eleName(n),null!=r.pubID&&(this.pubID=this.stringify.dtdPubID(r.pubID)),null!=r.sysID&&(this.sysID=this.stringify.dtdSysID(r.sysID))}return r(e,t),e.prototype.toString=function(t){return this.options.writer.set(t).dtdNotation(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing raw text");this.value=this.stringify.raw(n)}return r(e,t),e.prototype.clone=function(){return Object.create(this)},e.prototype.toString=function(t){return this.options.writer.set(t).raw(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing element text");this.value=this.stringify.eleText(n)}return r(e,t),e.prototype.clone=function(){return Object.create(this)},e.prototype.toString=function(t){return this.options.writer.set(t).text(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r=function(t,e){function n(){this.constructor=t}for(var r in e)i.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},i={}.hasOwnProperty;e=n(0),t.exports=function(t){function e(t,n,r){if(e.__super__.constructor.call(this,t),null==n)throw new Error("Missing instruction target");this.target=this.stringify.insTarget(n),r&&(this.value=this.stringify.insValue(r))}return r(e,t),e.prototype.clone=function(){return Object.create(this)},e.prototype.toString=function(t){return this.options.writer.set(t).processingInstruction(this)},e}(e)}).call(this)},function(t,e){function n(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function r(t){return"function"==typeof t}function i(t){return"number"==typeof t}function o(t){return"object"==typeof t&&null!==t}function s(t){return void 0===t}t.exports=n,n.EventEmitter=n,n.prototype._events=void 0,n.prototype._maxListeners=void 0,n.defaultMaxListeners=10,n.prototype.setMaxListeners=function(t){if(!i(t)||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},n.prototype.emit=function(t){var e,n,i,a,u,c;if(this._events||(this._events={}),"error"===t&&(!this._events.error||o(this._events.error)&&!this._events.error.length)){if((e=arguments[1])instanceof Error)throw e;var h=new Error('Uncaught, unspecified "error" event. ('+e+")");throw h.context=e,h}if(n=this._events[t],s(n))return!1;if(r(n))switch(arguments.length){case 1:n.call(this);break;case 2:n.call(this,arguments[1]);break;case 3:n.call(this,arguments[1],arguments[2]);break;default:a=Array.prototype.slice.call(arguments,1),n.apply(this,a)}else if(o(n))for(a=Array.prototype.slice.call(arguments,1),c=n.slice(),i=c.length,u=0;u<i;u++)c[u].apply(this,a);return!0},n.prototype.addListener=function(t,e){var i;if(!r(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,r(e.listener)?e.listener:e),this._events[t]?o(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,o(this._events[t])&&!this._events[t].warned&&(i=s(this._maxListeners)?n.defaultMaxListeners:this._maxListeners)&&i>0&&this._events[t].length>i&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace()),this},n.prototype.on=n.prototype.addListener,n.prototype.once=function(t,e){function n(){this.removeListener(t,n),i||(i=!0,e.apply(this,arguments))}if(!r(e))throw TypeError("listener must be a function");var i=!1;return n.listener=e,this.on(t,n),this},n.prototype.removeListener=function(t,e){var n,i,s,a;if(!r(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(n=this._events[t],s=n.length,i=-1,n===e||r(n.listener)&&n.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(o(n)){for(a=s;a-- >0;)if(n[a]===e||n[a].listener&&n[a].listener===e){i=a;break}if(i<0)return this;1===n.length?(n.length=0,delete this._events[t]):n.splice(i,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},n.prototype.removeAllListeners=function(t){var e,n;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(n=this._events[t],r(n))this.removeListener(t,n);else if(n)for(;n.length;)this.removeListener(t,n[n.length-1]);return delete this._events[t],this},n.prototype.listeners=function(t){return this._events&&this._events[t]?r(this._events[t])?[this._events[t]]:this._events[t].slice():[]},n.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(r(e))return 1;if(e)return e.length}return 0},n.listenerCount=function(t,e){return t.listenerCount(e)}},function(t,e){function n(){throw new Error("setTimeout has not been defined")}function r(){throw new Error("clearTimeout has not been defined")}function i(t){if(h===setTimeout)return setTimeout(t,0);if((h===n||!h)&&setTimeout)return h=setTimeout,setTimeout(t,0);try{return h(t,0)}catch(e){try{return h.call(null,t,0)}catch(e){return h.call(this,t,0)}}}function o(t){if(l===clearTimeout)return clearTimeout(t);if((l===r||!l)&&clearTimeout)return l=clearTimeout,clearTimeout(t);try{return l(t)}catch(e){try{return l.call(null,t)}catch(e){return l.call(this,t)}}}function s(){y&&p&&(y=!1,p.length?d=p.concat(d):g=-1,d.length&&a())}function a(){if(!y){var t=i(s);y=!0;for(var e=d.length;e;){for(p=d,d=[];++g<e;)p&&p[g].run();g=-1,e=d.length}p=null,y=!1,o(t)}}function u(t,e){this.fun=t,this.array=e}function c(){}var h,l,f=t.exports={};!function(){try{h="function"==typeof setTimeout?setTimeout:n}catch(t){h=n}try{l="function"==typeof clearTimeout?clearTimeout:r}catch(t){l=r}}();var p,d=[],y=!1,g=-1;f.nextTick=function(t){var e=new Array(arguments.length-1);if(arguments.length>1)for(var n=1;n<arguments.length;n++)e[n-1]=arguments[n];d.push(new u(t,e)),1!==d.length||y||i(a)},u.prototype.run=function(){this.fun.apply(null,this.array)},f.title="browser",f.browser=!0,f.env={},f.argv=[],f.version="",f.versions={},f.on=c,f.addListener=c,f.once=c,f.off=c,f.removeListener=c,f.removeAllListeners=c,f.emit=c,f.prependListener=c,f.prependOnceListener=c,f.listeners=function(t){return[]},f.binding=function(t){throw new Error("process.binding is not supported")},f.cwd=function(){return"/"},f.chdir=function(t){throw new Error("process.chdir is not supported")},f.umask=function(){return 0}},function(t,e,n){"use strict";(function(e){function n(t,n,r,i){if("function"!=typeof t)throw new TypeError('"callback" argument must be a function');var o,s,a=arguments.length;switch(a){case 0:case 1:return e.nextTick(t);case 2:return e.nextTick(function(){t.call(null,n)});case 3:return e.nextTick(function(){t.call(null,n,r)});case 4:return e.nextTick(function(){t.call(null,n,r,i)});default:for(o=new Array(a-1),s=0;s<o.length;)o[s++]=arguments[s];return e.nextTick(function(){t.apply(null,o)})}}!e.version||0===e.version.indexOf("v0.")||0===e.version.indexOf("v1.")&&0!==e.version.indexOf("v1.8.")?t.exports={nextTick:n}:t.exports=e}).call(e,n(20))},function(t,e,n){function r(t,e){for(var n in t)e[n]=t[n]}function i(t,e,n){return s(t,e,n)}var o=n(25),s=o.Buffer;s.from&&s.alloc&&s.allocUnsafe&&s.allocUnsafeSlow?t.exports=o:(r(o,e),e.Buffer=i),r(s,i),i.from=function(t,e,n){if("number"==typeof t)throw new TypeError("Argument must not be a number");return s(t,e,n)},i.alloc=function(t,e,n){if("number"!=typeof t)throw new TypeError("Argument must be a number");var r=s(t);return void 0!==e?"string"==typeof n?r.fill(e,n):r.fill(e):r.fill(0),r},i.allocUnsafe=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return s(t)},i.allocUnsafeSlow=function(t){if("number"!=typeof t)throw new TypeError("Argument must be a number");return o.SlowBuffer(t)}},function(t,e){(function(){e.defaults={.1:{explicitCharkey:!1,trim:!0,normalize:!0,normalizeTags:!1,attrkey:"@",charkey:"#",explicitArray:!1,ignoreAttrs:!1,mergeAttrs:!1,explicitRoot:!1,validator:null,xmlns:!1,explicitChildren:!1,childkey:"@@",charsAsChildren:!1,includeWhiteChars:!1,async:!1,strict:!0,attrNameProcessors:null,attrValueProcessors:null,tagNameProcessors:null,valueProcessors:null,emptyTag:""},.2:{explicitCharkey:!1,trim:!1,normalize:!1,normalizeTags:!1,attrkey:"$",charkey:"_",explicitArray:!0,ignoreAttrs:!1,mergeAttrs:!1,explicitRoot:!0,validator:null,xmlns:!1,explicitChildren:!1,preserveChildrenOrder:!1,childkey:"$$",charsAsChildren:!1,includeWhiteChars:!1,async:!1,strict:!0,attrNameProcessors:null,attrValueProcessors:null,tagNameProcessors:null,valueProcessors:null,rootName:"root",xmldec:{version:"1.0",encoding:"UTF-8",standalone:!0},doctype:null,renderOpts:{pretty:!0,indent:"  ",newline:"\n"},headless:!1,chunkSize:1e4,emptyTag:"",cdata:!1}}}).call(this)},function(t,e,n){(function(){var e,r,i,o,s,a,u,c,h,l,f,p,d,y=function(t,e){function n(){this.constructor=t}for(var r in e)g.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},g={}.hasOwnProperty;u=n(10),c=n(11),e=n(8),r=n(9),h=n(7),f=n(16),p=n(17),l=n(18),i=n(12),o=n(14),s=n(13),a=n(15),d=n(33),t.exports=function(t){function n(t){n.__super__.constructor.call(this,t)}return y(n,t),n.prototype.document=function(t){var e,n,i,o,s;for(this.textispresent=!1,o="",s=t.children,n=0,i=s.length;n<i;n++)e=s[n],o+=function(){switch(!1){case!(e instanceof u):return this.declaration(e);case!(e instanceof c):return this.docType(e);case!(e instanceof r):return this.comment(e);case!(e instanceof l):return this.processingInstruction(e);default:return this.element(e,0)}}.call(this);return this.pretty&&o.slice(-this.newline.length)===this.newline&&(o=o.slice(0,-this.newline.length)),o},n.prototype.attribute=function(t){return" "+t.name+'="'+t.value+'"'},n.prototype.cdata=function(t,e){return this.space(e)+"<![CDATA["+t.text+"]]>"+this.newline},n.prototype.comment=function(t,e){return this.space(e)+"\x3c!-- "+t.text+" --\x3e"+this.newline},n.prototype.declaration=function(t,e){var n;return n=this.space(e),n+='<?xml version="'+t.version+'"',null!=t.encoding&&(n+=' encoding="'+t.encoding+'"'),null!=t.standalone&&(n+=' standalone="'+t.standalone+'"'),n+=this.spacebeforeslash+"?>",n+=this.newline},n.prototype.docType=function(t,n){var u,c,h,f,p;if(n||(n=0),f=this.space(n),f+="<!DOCTYPE "+t.root().name,t.pubID&&t.sysID?f+=' PUBLIC "'+t.pubID+'" "'+t.sysID+'"':t.sysID&&(f+=' SYSTEM "'+t.sysID+'"'),t.children.length>0){for(f+=" [",f+=this.newline,p=t.children,c=0,h=p.length;c<h;c++)u=p[c],f+=function(){switch(!1){case!(u instanceof i):return this.dtdAttList(u,n+1);case!(u instanceof o):return this.dtdElement(u,n+1);case!(u instanceof s):return this.dtdEntity(u,n+1);case!(u instanceof a):return this.dtdNotation(u,n+1);case!(u instanceof e):return this.cdata(u,n+1);case!(u instanceof r):return this.comment(u,n+1);case!(u instanceof l):return this.processingInstruction(u,n+1);default:throw new Error("Unknown DTD node type: "+u.constructor.name)}}.call(this);f+="]"}return f+=this.spacebeforeslash+">",f+=this.newline},n.prototype.element=function(t,n){var i,o,s,a,u,c,d,y,m,w,v,b,_;n||(n=0),_=!1,this.textispresent?(this.newline="",this.pretty=!1):(this.newline=this.newlinedefault,this.pretty=this.prettydefault),b=this.space(n),y="",y+=b+"<"+t.name,m=t.attributes;for(d in m)g.call(m,d)&&(i=m[d],y+=this.attribute(i));if(0===t.children.length||t.children.every(function(t){return""===t.value}))this.allowEmpty?y+="></"+t.name+">"+this.newline:y+=this.spacebeforeslash+"/>"+this.newline;else if(this.pretty&&1===t.children.length&&null!=t.children[0].value)y+=">",y+=t.children[0].value,y+="</"+t.name+">"+this.newline;else{if(this.dontprettytextnodes)for(w=t.children,s=0,u=w.length;s<u;s++)if(o=w[s],null!=o.value){this.textispresent++,_=!0;break}for(this.textispresent&&(this.newline="",this.pretty=!1,b=this.space(n)),y+=">"+this.newline,v=t.children,a=0,c=v.length;a<c;a++)o=v[a],y+=function(){switch(!1){case!(o instanceof e):return this.cdata(o,n+1);case!(o instanceof r):return this.comment(o,n+1);case!(o instanceof h):return this.element(o,n+1);case!(o instanceof f):return this.raw(o,n+1);case!(o instanceof p):return this.text(o,n+1);case!(o instanceof l):return this.processingInstruction(o,n+1);default:throw new Error("Unknown XML node type: "+o.constructor.name)}}.call(this);_&&this.textispresent--,this.textispresent||(this.newline=this.newlinedefault,this.pretty=this.prettydefault),y+=b+"</"+t.name+">"+this.newline}return y},n.prototype.processingInstruction=function(t,e){var n;return n=this.space(e)+"<?"+t.target,t.value&&(n+=" "+t.value),n+=this.spacebeforeslash+"?>"+this.newline},n.prototype.raw=function(t,e){return this.space(e)+t.value+this.newline},n.prototype.text=function(t,e){return this.space(e)+t.value+this.newline},n.prototype.dtdAttList=function(t,e){var n;return n=this.space(e)+"<!ATTLIST "+t.elementName+" "+t.attributeName+" "+t.attributeType,"#DEFAULT"!==t.defaultValueType&&(n+=" "+t.defaultValueType),t.defaultValue&&(n+=' "'+t.defaultValue+'"'),n+=this.spacebeforeslash+">"+this.newline},n.prototype.dtdElement=function(t,e){return this.space(e)+"<!ELEMENT "+t.name+" "+t.value+this.spacebeforeslash+">"+this.newline},n.prototype.dtdEntity=function(t,e){var n;return n=this.space(e)+"<!ENTITY",t.pe&&(n+=" %"),n+=" "+t.name,t.value?n+=' "'+t.value+'"':(t.pubID&&t.sysID?n+=' PUBLIC "'+t.pubID+'" "'+t.sysID+'"':t.sysID&&(n+=' SYSTEM "'+t.sysID+'"'),t.nData&&(n+=" NDATA "+t.nData)),n+=this.spacebeforeslash+">"+this.newline},n.prototype.dtdNotation=function(t,e){var n;return n=this.space(e)+"<!NOTATION "+t.name,t.pubID&&t.sysID?n+=' PUBLIC "'+t.pubID+'" "'+t.sysID+'"':t.pubID?n+=' PUBLIC "'+t.pubID+'"':t.sysID&&(n+=' SYSTEM "'+t.sysID+'"'),n+=this.spacebeforeslash+">"+this.newline},n.prototype.openNode=function(t,e){var n,r,i,o;if(e||(e=0),t instanceof h){i=this.space(e)+"<"+t.name,o=t.attributes;for(r in o)g.call(o,r)&&(n=o[r],i+=this.attribute(n));return i+=(t.children?">":"/>")+this.newline}return i=this.space(e)+"<!DOCTYPE "+t.rootNodeName,t.pubID&&t.sysID?i+=' PUBLIC "'+t.pubID+'" "'+t.sysID+'"':t.sysID&&(i+=' SYSTEM "'+t.sysID+'"'),i+=(t.children?" [":">")+this.newline},n.prototype.closeNode=function(t,e){switch(e||(e=0),!1){case!(t instanceof h):return this.space(e)+"</"+t.name+">"+this.newline;case!(t instanceof c):return this.space(e)+"]>"+this.newline}},n}(d)}).call(this)},function(t,e,n){"use strict";(function(t){function r(){return o.TYPED_ARRAY_SUPPORT?2147483647:1073741823}function i(t,e){if(r()<e)throw new RangeError("Invalid typed array length");return o.TYPED_ARRAY_SUPPORT?(t=new Uint8Array(e),t.__proto__=o.prototype):(null===t&&(t=new o(e)),t.length=e),t}function o(t,e,n){if(!(o.TYPED_ARRAY_SUPPORT||this instanceof o))return new o(t,e,n);if("number"==typeof t){if("string"==typeof e)throw new Error("If encoding is specified then the first argument must be a string");return c(this,t)}return s(this,t,e,n)}function s(t,e,n,r){if("number"==typeof e)throw new TypeError('"value" argument must not be a number');return"undefined"!=typeof ArrayBuffer&&e instanceof ArrayBuffer?f(t,e,n,r):"string"==typeof e?h(t,e,n):p(t,e)}function a(t){if("number"!=typeof t)throw new TypeError('"size" argument must be a number');if(t<0)throw new RangeError('"size" argument must not be negative')}function u(t,e,n,r){return a(e),e<=0?i(t,e):void 0!==n?"string"==typeof r?i(t,e).fill(n,r):i(t,e).fill(n):i(t,e)}function c(t,e){if(a(e),t=i(t,e<0?0:0|d(e)),!o.TYPED_ARRAY_SUPPORT)for(var n=0;n<e;++n)t[n]=0;return t}function h(t,e,n){if("string"==typeof n&&""!==n||(n="utf8"),!o.isEncoding(n))throw new TypeError('"encoding" must be a valid string encoding');var r=0|g(e,n);t=i(t,r);var s=t.write(e,n);return s!==r&&(t=t.slice(0,s)),t}function l(t,e){var n=e.length<0?0:0|d(e.length);t=i(t,n);for(var r=0;r<n;r+=1)t[r]=255&e[r];return t}function f(t,e,n,r){if(e.byteLength,n<0||e.byteLength<n)throw new RangeError("'offset' is out of bounds");if(e.byteLength<n+(r||0))throw new RangeError("'length' is out of bounds");return e=void 0===n&&void 0===r?new Uint8Array(e):void 0===r?new Uint8Array(e,n):new Uint8Array(e,n,r),o.TYPED_ARRAY_SUPPORT?(t=e,t.__proto__=o.prototype):t=l(t,e),t}function p(t,e){if(o.isBuffer(e)){var n=0|d(e.length);return t=i(t,n),0===t.length?t:(e.copy(t,0,0,n),t)}if(e){if("undefined"!=typeof ArrayBuffer&&e.buffer instanceof ArrayBuffer||"length"in e)return"number"!=typeof e.length||$(e.length)?i(t,0):l(t,e);if("Buffer"===e.type&&K(e.data))return l(t,e.data)}throw new TypeError("First argument must be a string, Buffer, ArrayBuffer, Array, or array-like object.")}function d(t){if(t>=r())throw new RangeError("Attempt to allocate Buffer larger than maximum size: 0x"+r().toString(16)+" bytes");return 0|t}function y(t){return+t!=t&&(t=0),o.alloc(+t)}function g(t,e){if(o.isBuffer(t))return t.length;if("undefined"!=typeof ArrayBuffer&&"function"==typeof ArrayBuffer.isView&&(ArrayBuffer.isView(t)||t instanceof ArrayBuffer))return t.byteLength;"string"!=typeof t&&(t=""+t);var n=t.length;if(0===n)return 0;for(var r=!1;;)switch(e){case"ascii":case"latin1":case"binary":return n;case"utf8":case"utf-8":case void 0:return G(t).length;case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return 2*n;case"hex":return n>>>1;case"base64":return W(t).length;default:if(r)return G(t).length;e=(""+e).toLowerCase(),r=!0}}function m(t,e,n){var r=!1;if((void 0===e||e<0)&&(e=0),e>this.length)return"";if((void 0===n||n>this.length)&&(n=this.length),n<=0)return"";if(n>>>=0,e>>>=0,n<=e)return"";for(t||(t="utf8");;)switch(t){case"hex":return N(this,e,n);case"utf8":case"utf-8":return S(this,e,n);case"ascii":return O(this,e,n);case"latin1":case"binary":return B(this,e,n);case"base64":return x(this,e,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return P(this,e,n);default:if(r)throw new TypeError("Unknown encoding: "+t);t=(t+"").toLowerCase(),r=!0}}function w(t,e,n){var r=t[e];t[e]=t[n],t[n]=r}function v(t,e,n,r,i){if(0===t.length)return-1;if("string"==typeof n?(r=n,n=0):n>2147483647?n=2147483647:n<-2147483648&&(n=-2147483648),n=+n,isNaN(n)&&(n=i?0:t.length-1),n<0&&(n=t.length+n),n>=t.length){if(i)return-1;n=t.length-1}else if(n<0){if(!i)return-1;n=0}if("string"==typeof e&&(e=o.from(e,r)),o.isBuffer(e))return 0===e.length?-1:b(t,e,n,r,i);if("number"==typeof e)return e&=255,o.TYPED_ARRAY_SUPPORT&&"function"==typeof Uint8Array.prototype.indexOf?i?Uint8Array.prototype.indexOf.call(t,e,n):Uint8Array.prototype.lastIndexOf.call(t,e,n):b(t,[e],n,r,i);throw new TypeError("val must be string, number or Buffer")}function b(t,e,n,r,i){function o(t,e){return 1===s?t[e]:t.readUInt16BE(e*s)}var s=1,a=t.length,u=e.length;if(void 0!==r&&("ucs2"===(r=String(r).toLowerCase())||"ucs-2"===r||"utf16le"===r||"utf-16le"===r)){if(t.length<2||e.length<2)return-1;s=2,a/=2,u/=2,n/=2}var c;if(i){var h=-1;for(c=n;c<a;c++)if(o(t,c)===o(e,-1===h?0:c-h)){if(-1===h&&(h=c),c-h+1===u)return h*s}else-1!==h&&(c-=c-h),h=-1}else for(n+u>a&&(n=a-u),c=n;c>=0;c--){for(var l=!0,f=0;f<u;f++)if(o(t,c+f)!==o(e,f)){l=!1;break}if(l)return c}return-1}function _(t,e,n,r){n=Number(n)||0;var i=t.length-n;r?(r=Number(r))>i&&(r=i):r=i;var o=e.length;if(o%2!=0)throw new TypeError("Invalid hex string");r>o/2&&(r=o/2);for(var s=0;s<r;++s){var a=parseInt(e.substr(2*s,2),16);if(isNaN(a))return s;t[n+s]=a}return s}function E(t,e,n,r){return z(G(e,t.length-n),t,n,r)}function A(t,e,n,r){return z(X(e),t,n,r)}function T(t,e,n,r){return A(t,e,n,r)}function D(t,e,n,r){return z(W(e),t,n,r)}function C(t,e,n,r){return z(H(e,t.length-n),t,n,r)}function x(t,e,n){return 0===e&&n===t.length?Q.fromByteArray(t):Q.fromByteArray(t.slice(e,n))}function S(t,e,n){n=Math.min(t.length,n);for(var r=[],i=e;i<n;){var o=t[i],s=null,a=o>239?4:o>223?3:o>191?2:1;if(i+a<=n){var u,c,h,l;switch(a){case 1:o<128&&(s=o);break;case 2:u=t[i+1],128==(192&u)&&(l=(31&o)<<6|63&u)>127&&(s=l);break;case 3:u=t[i+1],c=t[i+2],128==(192&u)&&128==(192&c)&&(l=(15&o)<<12|(63&u)<<6|63&c)>2047&&(l<55296||l>57343)&&(s=l);break;case 4:u=t[i+1],c=t[i+2],h=t[i+3],128==(192&u)&&128==(192&c)&&128==(192&h)&&(l=(15&o)<<18|(63&u)<<12|(63&c)<<6|63&h)>65535&&l<1114112&&(s=l)}}null===s?(s=65533,a=1):s>65535&&(s-=65536,r.push(s>>>10&1023|55296),s=56320|1023&s),r.push(s),i+=a}return I(r)}function I(t){var e=t.length;if(e<=Z)return String.fromCharCode.apply(String,t);for(var n="",r=0;r<e;)n+=String.fromCharCode.apply(String,t.slice(r,r+=Z));return n}function O(t,e,n){var r="";n=Math.min(t.length,n);for(var i=e;i<n;++i)r+=String.fromCharCode(127&t[i]);return r}function B(t,e,n){var r="";n=Math.min(t.length,n);for(var i=e;i<n;++i)r+=String.fromCharCode(t[i]);return r}function N(t,e,n){var r=t.length;(!e||e<0)&&(e=0),(!n||n<0||n>r)&&(n=r);for(var i="",o=e;o<n;++o)i+=V(t[o]);return i}function P(t,e,n){for(var r=t.slice(e,n),i="",o=0;o<r.length;o+=2)i+=String.fromCharCode(r[o]+256*r[o+1]);return i}function F(t,e,n){if(t%1!=0||t<0)throw new RangeError("offset is not uint");if(t+e>n)throw new RangeError("Trying to access beyond buffer length")}function R(t,e,n,r,i,s){if(!o.isBuffer(t))throw new TypeError('"buffer" argument must be a Buffer instance');if(e>i||e<s)throw new RangeError('"value" argument is out of bounds');if(n+r>t.length)throw new RangeError("Index out of range")}function k(t,e,n,r){e<0&&(e=65535+e+1);for(var i=0,o=Math.min(t.length-n,2);i<o;++i)t[n+i]=(e&255<<8*(r?i:1-i))>>>8*(r?i:1-i)}function L(t,e,n,r){e<0&&(e=4294967295+e+1);for(var i=0,o=Math.min(t.length-n,4);i<o;++i)t[n+i]=e>>>8*(r?i:3-i)&255}function j(t,e,n,r,i,o){if(n+r>t.length)throw new RangeError("Index out of range");if(n<0)throw new RangeError("Index out of range")}function M(t,e,n,r,i){return i||j(t,e,n,4,3.4028234663852886e38,-3.4028234663852886e38),J.write(t,e,n,r,23,4),n+4}function U(t,e,n,r,i){return i||j(t,e,n,8,1.7976931348623157e308,-1.7976931348623157e308),J.write(t,e,n,r,52,8),n+8}function q(t){if(t=Y(t).replace(tt,""),t.length<2)return"";for(;t.length%4!=0;)t+="=";return t}function Y(t){return t.trim?t.trim():t.replace(/^\s+|\s+$/g,"")}function V(t){return t<16?"0"+t.toString(16):t.toString(16)}function G(t,e){e=e||1/0;for(var n,r=t.length,i=null,o=[],s=0;s<r;++s){if((n=t.charCodeAt(s))>55295&&n<57344){if(!i){if(n>56319){(e-=3)>-1&&o.push(239,191,189);continue}if(s+1===r){(e-=3)>-1&&o.push(239,191,189);continue}i=n;continue}if(n<56320){(e-=3)>-1&&o.push(239,191,189),i=n;continue}n=65536+(i-55296<<10|n-56320)}else i&&(e-=3)>-1&&o.push(239,191,189);if(i=null,n<128){if((e-=1)<0)break;o.push(n)}else if(n<2048){if((e-=2)<0)break;o.push(n>>6|192,63&n|128)}else if(n<65536){if((e-=3)<0)break;o.push(n>>12|224,n>>6&63|128,63&n|128)}else{if(!(n<1114112))throw new Error("Invalid code point");if((e-=4)<0)break;o.push(n>>18|240,n>>12&63|128,n>>6&63|128,63&n|128)}}return o}function X(t){for(var e=[],n=0;n<t.length;++n)e.push(255&t.charCodeAt(n));return e}function H(t,e){for(var n,r,i,o=[],s=0;s<t.length&&!((e-=2)<0);++s)n=t.charCodeAt(s),r=n>>8,i=n%256,o.push(i),o.push(r);return o}function W(t){return Q.toByteArray(q(t))}function z(t,e,n,r){for(var i=0;i<r&&!(i+n>=e.length||i>=t.length);++i)e[i+n]=t[i];return i}function $(t){return t!==t}var Q=n(70),J=n(71),K=n(34);e.Buffer=o,e.SlowBuffer=y,e.INSPECT_MAX_BYTES=50,o.TYPED_ARRAY_SUPPORT=void 0!==t.TYPED_ARRAY_SUPPORT?t.TYPED_ARRAY_SUPPORT:function(){try{var t=new Uint8Array(1);return t.__proto__={__proto__:Uint8Array.prototype,foo:function(){return 42}},42===t.foo()&&"function"==typeof t.subarray&&0===t.subarray(1,1).byteLength}catch(t){return!1}}(),e.kMaxLength=r(),o.poolSize=8192,o._augment=function(t){return t.__proto__=o.prototype,t},o.from=function(t,e,n){return s(null,t,e,n)},o.TYPED_ARRAY_SUPPORT&&(o.prototype.__proto__=Uint8Array.prototype,o.__proto__=Uint8Array,"undefined"!=typeof Symbol&&Symbol.species&&o[Symbol.species]===o&&Object.defineProperty(o,Symbol.species,{value:null,configurable:!0})),o.alloc=function(t,e,n){return u(null,t,e,n)},o.allocUnsafe=function(t){return c(null,t)},o.allocUnsafeSlow=function(t){return c(null,t)},o.isBuffer=function(t){return!(null==t||!t._isBuffer)},o.compare=function(t,e){if(!o.isBuffer(t)||!o.isBuffer(e))throw new TypeError("Arguments must be Buffers");if(t===e)return 0;for(var n=t.length,r=e.length,i=0,s=Math.min(n,r);i<s;++i)if(t[i]!==e[i]){n=t[i],r=e[i];break}return n<r?-1:r<n?1:0},o.isEncoding=function(t){switch(String(t).toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"latin1":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return!0;default:return!1}},o.concat=function(t,e){if(!K(t))throw new TypeError('"list" argument must be an Array of Buffers');if(0===t.length)return o.alloc(0);var n;if(void 0===e)for(e=0,n=0;n<t.length;++n)e+=t[n].length;var r=o.allocUnsafe(e),i=0;for(n=0;n<t.length;++n){var s=t[n];if(!o.isBuffer(s))throw new TypeError('"list" argument must be an Array of Buffers');s.copy(r,i),i+=s.length}return r},o.byteLength=g,o.prototype._isBuffer=!0,o.prototype.swap16=function(){var t=this.length;if(t%2!=0)throw new RangeError("Buffer size must be a multiple of 16-bits");for(var e=0;e<t;e+=2)w(this,e,e+1);return this},o.prototype.swap32=function(){var t=this.length;if(t%4!=0)throw new RangeError("Buffer size must be a multiple of 32-bits");for(var e=0;e<t;e+=4)w(this,e,e+3),w(this,e+1,e+2);return this},o.prototype.swap64=function(){var t=this.length;if(t%8!=0)throw new RangeError("Buffer size must be a multiple of 64-bits");for(var e=0;e<t;e+=8)w(this,e,e+7),w(this,e+1,e+6),w(this,e+2,e+5),w(this,e+3,e+4);return this},o.prototype.toString=function(){var t=0|this.length;return 0===t?"":0===arguments.length?S(this,0,t):m.apply(this,arguments)},o.prototype.equals=function(t){if(!o.isBuffer(t))throw new TypeError("Argument must be a Buffer");return this===t||0===o.compare(this,t)},o.prototype.inspect=function(){var t="",n=e.INSPECT_MAX_BYTES;return this.length>0&&(t=this.toString("hex",0,n).match(/.{2}/g).join(" "),this.length>n&&(t+=" ... ")),"<Buffer "+t+">"},o.prototype.compare=function(t,e,n,r,i){if(!o.isBuffer(t))throw new TypeError("Argument must be a Buffer");if(void 0===e&&(e=0),void 0===n&&(n=t?t.length:0),void 0===r&&(r=0),void 0===i&&(i=this.length),e<0||n>t.length||r<0||i>this.length)throw new RangeError("out of range index");if(r>=i&&e>=n)return 0;if(r>=i)return-1;if(e>=n)return 1;if(e>>>=0,n>>>=0,r>>>=0,i>>>=0,this===t)return 0;for(var s=i-r,a=n-e,u=Math.min(s,a),c=this.slice(r,i),h=t.slice(e,n),l=0;l<u;++l)if(c[l]!==h[l]){s=c[l],a=h[l];break}return s<a?-1:a<s?1:0},o.prototype.includes=function(t,e,n){return-1!==this.indexOf(t,e,n)},o.prototype.indexOf=function(t,e,n){return v(this,t,e,n,!0)},o.prototype.lastIndexOf=function(t,e,n){return v(this,t,e,n,!1)},o.prototype.write=function(t,e,n,r){if(void 0===e)r="utf8",n=this.length,e=0;else if(void 0===n&&"string"==typeof e)r=e,n=this.length,e=0;else{if(!isFinite(e))throw new Error("Buffer.write(string, encoding, offset[, length]) is no longer supported");e|=0,isFinite(n)?(n|=0,void 0===r&&(r="utf8")):(r=n,n=void 0)}var i=this.length-e;if((void 0===n||n>i)&&(n=i),t.length>0&&(n<0||e<0)||e>this.length)throw new RangeError("Attempt to write outside buffer bounds");r||(r="utf8");for(var o=!1;;)switch(r){case"hex":return _(this,t,e,n);case"utf8":case"utf-8":return E(this,t,e,n);case"ascii":return A(this,t,e,n);case"latin1":case"binary":return T(this,t,e,n);case"base64":return D(this,t,e,n);case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return C(this,t,e,n);default:if(o)throw new TypeError("Unknown encoding: "+r);r=(""+r).toLowerCase(),o=!0}},o.prototype.toJSON=function(){return{type:"Buffer",data:Array.prototype.slice.call(this._arr||this,0)}};var Z=4096;o.prototype.slice=function(t,e){var n=this.length;t=~~t,e=void 0===e?n:~~e,t<0?(t+=n)<0&&(t=0):t>n&&(t=n),e<0?(e+=n)<0&&(e=0):e>n&&(e=n),e<t&&(e=t);var r;if(o.TYPED_ARRAY_SUPPORT)r=this.subarray(t,e),r.__proto__=o.prototype;else{var i=e-t;r=new o(i,void 0);for(var s=0;s<i;++s)r[s]=this[s+t]}return r},o.prototype.readUIntLE=function(t,e,n){t|=0,e|=0,n||F(t,e,this.length);for(var r=this[t],i=1,o=0;++o<e&&(i*=256);)r+=this[t+o]*i;return r},o.prototype.readUIntBE=function(t,e,n){t|=0,e|=0,n||F(t,e,this.length);for(var r=this[t+--e],i=1;e>0&&(i*=256);)r+=this[t+--e]*i;return r},o.prototype.readUInt8=function(t,e){return e||F(t,1,this.length),this[t]},o.prototype.readUInt16LE=function(t,e){return e||F(t,2,this.length),this[t]|this[t+1]<<8},o.prototype.readUInt16BE=function(t,e){return e||F(t,2,this.length),this[t]<<8|this[t+1]},o.prototype.readUInt32LE=function(t,e){return e||F(t,4,this.length),(this[t]|this[t+1]<<8|this[t+2]<<16)+16777216*this[t+3]},o.prototype.readUInt32BE=function(t,e){return e||F(t,4,this.length),16777216*this[t]+(this[t+1]<<16|this[t+2]<<8|this[t+3])},o.prototype.readIntLE=function(t,e,n){t|=0,e|=0,n||F(t,e,this.length);for(var r=this[t],i=1,o=0;++o<e&&(i*=256);)r+=this[t+o]*i;return i*=128,r>=i&&(r-=Math.pow(2,8*e)),r},o.prototype.readIntBE=function(t,e,n){t|=0,e|=0,n||F(t,e,this.length);for(var r=e,i=1,o=this[t+--r];r>0&&(i*=256);)o+=this[t+--r]*i;return i*=128,o>=i&&(o-=Math.pow(2,8*e)),o},o.prototype.readInt8=function(t,e){return e||F(t,1,this.length),128&this[t]?-1*(255-this[t]+1):this[t]},o.prototype.readInt16LE=function(t,e){e||F(t,2,this.length);var n=this[t]|this[t+1]<<8;return 32768&n?4294901760|n:n},o.prototype.readInt16BE=function(t,e){e||F(t,2,this.length);var n=this[t+1]|this[t]<<8;return 32768&n?4294901760|n:n},o.prototype.readInt32LE=function(t,e){return e||F(t,4,this.length),this[t]|this[t+1]<<8|this[t+2]<<16|this[t+3]<<24},o.prototype.readInt32BE=function(t,e){return e||F(t,4,this.length),this[t]<<24|this[t+1]<<16|this[t+2]<<8|this[t+3]},o.prototype.readFloatLE=function(t,e){return e||F(t,4,this.length),J.read(this,t,!0,23,4)},o.prototype.readFloatBE=function(t,e){return e||F(t,4,this.length),J.read(this,t,!1,23,4)},o.prototype.readDoubleLE=function(t,e){return e||F(t,8,this.length),J.read(this,t,!0,52,8)},o.prototype.readDoubleBE=function(t,e){return e||F(t,8,this.length),J.read(this,t,!1,52,8)},o.prototype.writeUIntLE=function(t,e,n,r){if(t=+t,e|=0,n|=0,!r){R(this,t,e,n,Math.pow(2,8*n)-1,0)}var i=1,o=0;for(this[e]=255&t;++o<n&&(i*=256);)this[e+o]=t/i&255;return e+n},o.prototype.writeUIntBE=function(t,e,n,r){if(t=+t,e|=0,n|=0,!r){R(this,t,e,n,Math.pow(2,8*n)-1,0)}var i=n-1,o=1;for(this[e+i]=255&t;--i>=0&&(o*=256);)this[e+i]=t/o&255;return e+n},o.prototype.writeUInt8=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,1,255,0),o.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),this[e]=255&t,e+1},o.prototype.writeUInt16LE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,2,65535,0),o.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):k(this,t,e,!0),e+2},o.prototype.writeUInt16BE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,2,65535,0),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):k(this,t,e,!1),e+2},o.prototype.writeUInt32LE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,4,4294967295,0),o.TYPED_ARRAY_SUPPORT?(this[e+3]=t>>>24,this[e+2]=t>>>16,this[e+1]=t>>>8,this[e]=255&t):L(this,t,e,!0),e+4},o.prototype.writeUInt32BE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,4,4294967295,0),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},o.prototype.writeIntLE=function(t,e,n,r){if(t=+t,e|=0,!r){var i=Math.pow(2,8*n-1);R(this,t,e,n,i-1,-i)}var o=0,s=1,a=0;for(this[e]=255&t;++o<n&&(s*=256);)t<0&&0===a&&0!==this[e+o-1]&&(a=1),this[e+o]=(t/s>>0)-a&255;return e+n},o.prototype.writeIntBE=function(t,e,n,r){if(t=+t,e|=0,!r){var i=Math.pow(2,8*n-1);R(this,t,e,n,i-1,-i)}var o=n-1,s=1,a=0;for(this[e+o]=255&t;--o>=0&&(s*=256);)t<0&&0===a&&0!==this[e+o+1]&&(a=1),this[e+o]=(t/s>>0)-a&255;return e+n},o.prototype.writeInt8=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,1,127,-128),o.TYPED_ARRAY_SUPPORT||(t=Math.floor(t)),t<0&&(t=255+t+1),this[e]=255&t,e+1},o.prototype.writeInt16LE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,2,32767,-32768),o.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8):k(this,t,e,!0),e+2},o.prototype.writeInt16BE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,2,32767,-32768),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>8,this[e+1]=255&t):k(this,t,e,!1),e+2},o.prototype.writeInt32LE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,4,2147483647,-2147483648),o.TYPED_ARRAY_SUPPORT?(this[e]=255&t,this[e+1]=t>>>8,this[e+2]=t>>>16,this[e+3]=t>>>24):L(this,t,e,!0),e+4},o.prototype.writeInt32BE=function(t,e,n){return t=+t,e|=0,n||R(this,t,e,4,2147483647,-2147483648),t<0&&(t=4294967295+t+1),o.TYPED_ARRAY_SUPPORT?(this[e]=t>>>24,this[e+1]=t>>>16,this[e+2]=t>>>8,this[e+3]=255&t):L(this,t,e,!1),e+4},o.prototype.writeFloatLE=function(t,e,n){return M(this,t,e,!0,n)},o.prototype.writeFloatBE=function(t,e,n){return M(this,t,e,!1,n)},o.prototype.writeDoubleLE=function(t,e,n){return U(this,t,e,!0,n)},o.prototype.writeDoubleBE=function(t,e,n){return U(this,t,e,!1,n)},o.prototype.copy=function(t,e,n,r){if(n||(n=0),r||0===r||(r=this.length),e>=t.length&&(e=t.length),e||(e=0),r>0&&r<n&&(r=n),r===n)return 0;if(0===t.length||0===this.length)return 0;if(e<0)throw new RangeError("targetStart out of bounds");if(n<0||n>=this.length)throw new RangeError("sourceStart out of bounds");if(r<0)throw new RangeError("sourceEnd out of bounds");r>this.length&&(r=this.length),t.length-e<r-n&&(r=t.length-e+n);var i,s=r-n;if(this===t&&n<e&&e<r)for(i=s-1;i>=0;--i)t[i+e]=this[i+n];else if(s<1e3||!o.TYPED_ARRAY_SUPPORT)for(i=0;i<s;++i)t[i+e]=this[i+n];else Uint8Array.prototype.set.call(t,this.subarray(n,n+s),e);return s},o.prototype.fill=function(t,e,n,r){if("string"==typeof t){if("string"==typeof e?(r=e,e=0,n=this.length):"string"==typeof n&&(r=n,n=this.length),1===t.length){var i=t.charCodeAt(0);i<256&&(t=i)}if(void 0!==r&&"string"!=typeof r)throw new TypeError("encoding must be a string");if("string"==typeof r&&!o.isEncoding(r))throw new TypeError("Unknown encoding: "+r)}else"number"==typeof t&&(t&=255);if(e<0||this.length<e||this.length<n)throw new RangeError("Out of range index");if(n<=e)return this;e>>>=0,n=void 0===n?this.length:n>>>0,t||(t=0);var s;if("number"==typeof t)for(s=e;s<n;++s)this[s]=t;else{var a=o.isBuffer(t)?t:G(new o(t,r).toString()),u=a.length;for(s=0;s<n-e;++s)this[s+e]=a[s%u]}return this};var tt=/[^+\/0-9A-Za-z-_]/g}).call(e,n(1))},function(t,e,n){e=t.exports=n(35),e.Stream=e,e.Readable=e,e.Writable=n(27),e.Duplex=n(3),e.Transform=n(39),e.PassThrough=n(78)},function(t,e,n){"use strict";(function(e,r,i){function o(t){var e=this;this.next=null,this.entry=null,this.finish=function(){x(e,t)}}function s(t){return F.from(t)}function a(t){return F.isBuffer(t)||t instanceof R}function u(){}function c(t,e){I=I||n(3),t=t||{};var r=e instanceof I;this.objectMode=!!t.objectMode,r&&(this.objectMode=this.objectMode||!!t.writableObjectMode);var i=t.highWaterMark,s=t.writableHighWaterMark,a=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:r&&(s||0===s)?s:a,this.highWaterMark=Math.floor(this.highWaterMark),this.finalCalled=!1,this.needDrain=!1,this.ending=!1,this.ended=!1,this.finished=!1,this.destroyed=!1;var u=!1===t.decodeStrings;this.decodeStrings=!u,this.defaultEncoding=t.defaultEncoding||"utf8",this.length=0,this.writing=!1,this.corked=0,this.sync=!0,this.bufferProcessing=!1,this.onwrite=function(t){w(e,t)},this.writecb=null,this.writelen=0,this.bufferedRequest=null,this.lastBufferedRequest=null,this.pendingcb=0,this.prefinished=!1,this.errorEmitted=!1,this.bufferedRequestCount=0,this.corkedRequestsFree=new o(this)}function h(t){if(I=I||n(3),!(L.call(h,this)||this instanceof I))return new h(t);this._writableState=new c(t,this),this.writable=!0,t&&("function"==typeof t.write&&(this._write=t.write),"function"==typeof t.writev&&(this._writev=t.writev),"function"==typeof t.destroy&&(this._destroy=t.destroy),"function"==typeof t.final&&(this._final=t.final)),P.call(this)}function l(t,e){var n=new Error("write after end");t.emit("error",n),S(e,n)}function f(t,e,n,r){var i=!0,o=!1;return null===n?o=new TypeError("May not write null values to stream"):"string"==typeof n||void 0===n||e.objectMode||(o=new TypeError("Invalid non-string/buffer chunk")),o&&(t.emit("error",o),S(r,o),i=!1),i}function p(t,e,n){return t.objectMode||!1===t.decodeStrings||"string"!=typeof e||(e=F.from(e,n)),e}function d(t,e,n,r,i,o){if(!n){var s=p(e,r,i);r!==s&&(n=!0,i="buffer",r=s)}var a=e.objectMode?1:r.length;e.length+=a;var u=e.length<e.highWaterMark;if(u||(e.needDrain=!0),e.writing||e.corked){var c=e.lastBufferedRequest;e.lastBufferedRequest={chunk:r,encoding:i,isBuf:n,callback:o,next:null},c?c.next=e.lastBufferedRequest:e.bufferedRequest=e.lastBufferedRequest,e.bufferedRequestCount+=1}else y(t,e,!1,a,r,i,o);return u}function y(t,e,n,r,i,o,s){e.writelen=r,e.writecb=s,e.writing=!0,e.sync=!0,n?t._writev(i,e.onwrite):t._write(i,o,e.onwrite),e.sync=!1}function g(t,e,n,r,i){--e.pendingcb,n?(S(i,r),S(D,t,e),t._writableState.errorEmitted=!0,t.emit("error",r)):(i(r),t._writableState.errorEmitted=!0,t.emit("error",r),D(t,e))}function m(t){t.writing=!1,t.writecb=null,t.length-=t.writelen,t.writelen=0}function w(t,e){var n=t._writableState,r=n.sync,i=n.writecb;if(m(n),e)g(t,n,r,e,i);else{var o=E(n);o||n.corked||n.bufferProcessing||!n.bufferedRequest||_(t,n),r?O(v,t,n,o,i):v(t,n,o,i)}}function v(t,e,n,r){n||b(t,e),e.pendingcb--,r(),D(t,e)}function b(t,e){0===e.length&&e.needDrain&&(e.needDrain=!1,t.emit("drain"))}function _(t,e){e.bufferProcessing=!0;var n=e.bufferedRequest;if(t._writev&&n&&n.next){var r=e.bufferedRequestCount,i=new Array(r),s=e.corkedRequestsFree;s.entry=n;for(var a=0,u=!0;n;)i[a]=n,n.isBuf||(u=!1),n=n.next,a+=1;i.allBuffers=u,y(t,e,!0,e.length,i,"",s.finish),e.pendingcb++,e.lastBufferedRequest=null,s.next?(e.corkedRequestsFree=s.next,s.next=null):e.corkedRequestsFree=new o(e),e.bufferedRequestCount=0}else{for(;n;){var c=n.chunk,h=n.encoding,l=n.callback;if(y(t,e,!1,e.objectMode?1:c.length,c,h,l),n=n.next,e.bufferedRequestCount--,e.writing)break}null===n&&(e.lastBufferedRequest=null)}e.bufferedRequest=n,e.bufferProcessing=!1}function E(t){return t.ending&&0===t.length&&null===t.bufferedRequest&&!t.finished&&!t.writing}function A(t,e){t._final(function(n){e.pendingcb--,n&&t.emit("error",n),e.prefinished=!0,t.emit("prefinish"),D(t,e)})}function T(t,e){e.prefinished||e.finalCalled||("function"==typeof t._final?(e.pendingcb++,e.finalCalled=!0,S(A,t,e)):(e.prefinished=!0,t.emit("prefinish")))}function D(t,e){var n=E(e);return n&&(T(t,e),0===e.pendingcb&&(e.finished=!0,t.emit("finish"))),n}function C(t,e,n){e.ending=!0,D(t,e),n&&(e.finished?S(n):t.once("finish",n)),e.ended=!0,t.writable=!1}function x(t,e,n){var r=t.entry;for(t.entry=null;r;){var i=r.callback;e.pendingcb--,i(n),r=r.next}e.corkedRequestsFree?e.corkedRequestsFree.next=t:e.corkedRequestsFree=t}var S=n(21).nextTick;t.exports=h;var I,O=!e.browser&&["v0.10","v0.9."].indexOf(e.version.slice(0,5))>-1?r:S;h.WritableState=c;var B=n(6);B.inherits=n(5);var N={deprecate:n(77)},P=n(36),F=n(22).Buffer,R=i.Uint8Array||function(){},k=n(37);B.inherits(h,P),c.prototype.getBuffer=function(){for(var t=this.bufferedRequest,e=[];t;)e.push(t),t=t.next;return e},function(){try{Object.defineProperty(c.prototype,"buffer",{get:N.deprecate(function(){return this.getBuffer()},"_writableState.buffer is deprecated. Use _writableState.getBuffer instead.","DEP0003")})}catch(t){}}();var L;"function"==typeof Symbol&&Symbol.hasInstance&&"function"==typeof Function.prototype[Symbol.hasInstance]?(L=Function.prototype[Symbol.hasInstance],Object.defineProperty(h,Symbol.hasInstance,{value:function(t){return!!L.call(this,t)||this===h&&(t&&t._writableState instanceof c)}})):L=function(t){return t instanceof this},h.prototype.pipe=function(){this.emit("error",new Error("Cannot pipe, not readable"))},h.prototype.write=function(t,e,n){var r=this._writableState,i=!1,o=!r.objectMode&&a(t);return o&&!F.isBuffer(t)&&(t=s(t)),"function"==typeof e&&(n=e,e=null),o?e="buffer":e||(e=r.defaultEncoding),"function"!=typeof n&&(n=u),r.ended?l(this,n):(o||f(this,r,t,n))&&(r.pendingcb++,i=d(this,r,o,t,e,n)),i},h.prototype.cork=function(){this._writableState.corked++},h.prototype.uncork=function(){var t=this._writableState;t.corked&&(t.corked--,t.writing||t.corked||t.finished||t.bufferProcessing||!t.bufferedRequest||_(this,t))},h.prototype.setDefaultEncoding=function(t){if("string"==typeof t&&(t=t.toLowerCase()),!(["hex","utf8","utf-8","ascii","binary","base64","ucs2","ucs-2","utf16le","utf-16le","raw"].indexOf((t+"").toLowerCase())>-1))throw new TypeError("Unknown encoding: "+t);return this._writableState.defaultEncoding=t,this},h.prototype._write=function(t,e,n){n(new Error("_write() is not implemented"))},h.prototype._writev=null,h.prototype.end=function(t,e,n){var r=this._writableState;"function"==typeof t?(n=t,t=null,e=null):"function"==typeof e&&(n=e,e=null),null!==t&&void 0!==t&&this.write(t,e),r.corked&&(r.corked=1,this.uncork()),r.ending||r.finished||C(this,r,n)},Object.defineProperty(h.prototype,"destroyed",{get:function(){return void 0!==this._writableState&&this._writableState.destroyed},set:function(t){this._writableState&&(this._writableState.destroyed=t)}}),h.prototype.destroy=k.destroy,h.prototype._undestroy=k.undestroy,h.prototype._destroy=function(t,e){this.end(),e(t)}}).call(e,n(20),n(38).setImmediate,n(1))},function(t,e,n){"use strict";function r(t){if(!t)return"utf8";for(var e;;)switch(t){case"utf8":case"utf-8":return"utf8";case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":return"utf16le";case"latin1":case"binary":return"latin1";case"base64":case"ascii":case"hex":return t;default:if(e)return;t=(""+t).toLowerCase(),e=!0}}function i(t){var e=r(t);if("string"!=typeof e&&(w.isEncoding===v||!v(t)))throw new Error("Unknown encoding: "+t);return e||t}function o(t){this.encoding=i(t);var e;switch(this.encoding){case"utf16le":this.text=f,this.end=p,e=4;break;case"utf8":this.fillLast=c,e=4;break;case"base64":this.text=d,this.end=y,e=3;break;default:return this.write=g,void(this.end=m)}this.lastNeed=0,this.lastTotal=0,this.lastChar=w.allocUnsafe(e)}function s(t){return t<=127?0:t>>5==6?2:t>>4==14?3:t>>3==30?4:-1}function a(t,e,n){var r=e.length-1;if(r<n)return 0;var i=s(e[r]);return i>=0?(i>0&&(t.lastNeed=i-1),i):--r<n?0:(i=s(e[r]))>=0?(i>0&&(t.lastNeed=i-2),i):--r<n?0:(i=s(e[r]),i>=0?(i>0&&(2===i?i=0:t.lastNeed=i-3),i):0)}function u(t,e,n){if(128!=(192&e[0]))return t.lastNeed=0,"�".repeat(n);if(t.lastNeed>1&&e.length>1){if(128!=(192&e[1]))return t.lastNeed=1,"�".repeat(n+1);if(t.lastNeed>2&&e.length>2&&128!=(192&e[2]))return t.lastNeed=2,"�".repeat(n+2)}}function c(t){var e=this.lastTotal-this.lastNeed,n=u(this,t,e);return void 0!==n?n:this.lastNeed<=t.length?(t.copy(this.lastChar,e,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal)):(t.copy(this.lastChar,e,0,t.length),void(this.lastNeed-=t.length))}function h(t,e){var n=a(this,t,e);if(!this.lastNeed)return t.toString("utf8",e);this.lastTotal=n;var r=t.length-(n-this.lastNeed);return t.copy(this.lastChar,0,r),t.toString("utf8",e,r)}function l(t){var e=t&&t.length?this.write(t):"";return this.lastNeed?e+"�".repeat(this.lastTotal-this.lastNeed):e}function f(t,e){if((t.length-e)%2==0){var n=t.toString("utf16le",e);if(n){var r=n.charCodeAt(n.length-1);if(r>=55296&&r<=56319)return this.lastNeed=2,this.lastTotal=4,this.lastChar[0]=t[t.length-2],this.lastChar[1]=t[t.length-1],n.slice(0,-1)}return n}return this.lastNeed=1,this.lastTotal=2,this.lastChar[0]=t[t.length-1],t.toString("utf16le",e,t.length-1)}function p(t){var e=t&&t.length?this.write(t):"";if(this.lastNeed){var n=this.lastTotal-this.lastNeed;return e+this.lastChar.toString("utf16le",0,n)}return e}function d(t,e){var n=(t.length-e)%3;return 0===n?t.toString("base64",e):(this.lastNeed=3-n,this.lastTotal=3,1===n?this.lastChar[0]=t[t.length-1]:(this.lastChar[0]=t[t.length-2],this.lastChar[1]=t[t.length-1]),t.toString("base64",e,t.length-n))}function y(t){var e=t&&t.length?this.write(t):"";return this.lastNeed?e+this.lastChar.toString("base64",0,3-this.lastNeed):e}function g(t){return t.toString(this.encoding)}function m(t){return t&&t.length?this.write(t):""}var w=n(22).Buffer,v=w.isEncoding||function(t){switch((t=""+t)&&t.toLowerCase()){case"hex":case"utf8":case"utf-8":case"ascii":case"binary":case"base64":case"ucs2":case"ucs-2":case"utf16le":case"utf-16le":case"raw":return!0;default:return!1}};e.StringDecoder=o,o.prototype.write=function(t){if(0===t.length)return"";var e,n;if(this.lastNeed){if(void 0===(e=this.fillLast(t)))return"";n=this.lastNeed,this.lastNeed=0}else n=0;return n<t.length?e?e+this.text(t,n):this.text(t,n):e||""},o.prototype.end=l,o.prototype.text=h,o.prototype.fillLast=function(t){if(this.lastNeed<=t.length)return t.copy(this.lastChar,this.lastTotal-this.lastNeed,0,this.lastNeed),this.lastChar.toString(this.encoding,0,this.lastTotal);t.copy(this.lastChar,this.lastTotal-this.lastNeed,0,t.length),this.lastNeed-=t.length}},function(t,e){function n(){for(var t={},e=0;e<arguments.length;e++){var n=arguments[e];for(var i in n)r.call(n,i)&&(t[i]=n[i])}return t}t.exports=n;var r=Object.prototype.hasOwnProperty},function(t,e,n){"use strict";function r(t){return t.replace(/\/*$/,"")}function i(t){return JSON.parse(JSON.stringify(t))}function o(t){return/^(\w+)\//.exec(t)[1]}function s(t){return/\/(\d+)$/.exec(t)[1]}function a(t){var e=[],n=!0,r=!1,i=void 0;try{for(var o,s=Object.keys(t)[Symbol.iterator]();!(n=(o=s.next()).done);n=!0){var a=o.value,u=encodeURIComponent(a),c=encodeURIComponent(t[a]);e.push(u+"="+c)}}catch(t){r=!0,i=t}finally{try{!n&&s.return&&s.return()}finally{if(r)throw i}}return(e.length>0?"?":"")+e.join("&")}Object.defineProperty(e,"__esModule",{value:!0}),e.removeTrailingSlashes=r,e.simpleObjectDeepClone=i,e.findElementType=o,e.findElementId=s,e.buildQueryString=a},function(t,e){(function(){t.exports=function(){function t(t,e,n){if(this.options=t.options,this.stringify=t.stringify,null==e)throw new Error("Missing attribute name of element "+t.name);if(null==n)throw new Error("Missing attribute value for attribute "+e+" of element "+t.name);this.name=this.stringify.attName(e),this.value=this.stringify.attValue(n)}return t.prototype.clone=function(){return Object.create(this)},t.prototype.toString=function(t){return this.options.writer.set(t).attribute(this)},t}()}).call(this)},function(t,e){(function(){var e=function(t,e){return function(){return t.apply(e,arguments)}},n={}.hasOwnProperty;t.exports=function(){function t(t){this.assertLegalChar=e(this.assertLegalChar,this);var r,i,o;t||(t={}),this.noDoubleEncoding=t.noDoubleEncoding,i=t.stringify||{};for(r in i)n.call(i,r)&&(o=i[r],this[r]=o)}return t.prototype.eleName=function(t){return t=""+t||"",this.assertLegalChar(t)},t.prototype.eleText=function(t){return t=""+t||"",this.assertLegalChar(this.elEscape(t))},t.prototype.cdata=function(t){return t=""+t||"",t=t.replace("]]>","]]]]><![CDATA[>"),this.assertLegalChar(t)},t.prototype.comment=function(t){if(t=""+t||"",t.match(/--/))throw new Error("Comment text cannot contain double-hypen: "+t);return this.assertLegalChar(t)},t.prototype.raw=function(t){return""+t||""},t.prototype.attName=function(t){return t=""+t||""},t.prototype.attValue=function(t){return t=""+t||"",this.attEscape(t)},t.prototype.insTarget=function(t){return""+t||""},t.prototype.insValue=function(t){if(t=""+t||"",t.match(/\?>/))throw new Error("Invalid processing instruction value: "+t);return t},t.prototype.xmlVersion=function(t){if(t=""+t||"",!t.match(/1\.[0-9]+/))throw new Error("Invalid version number: "+t);return t},t.prototype.xmlEncoding=function(t){if(t=""+t||"",!t.match(/^[A-Za-z](?:[A-Za-z0-9._-])*$/))throw new Error("Invalid encoding: "+t);return t},t.prototype.xmlStandalone=function(t){return t?"yes":"no"},t.prototype.dtdPubID=function(t){return""+t||""},t.prototype.dtdSysID=function(t){return""+t||""},t.prototype.dtdElementValue=function(t){return""+t||""},t.prototype.dtdAttType=function(t){return""+t||""},t.prototype.dtdAttDefault=function(t){return null!=t?""+t||"":t},t.prototype.dtdEntityValue=function(t){return""+t||""},t.prototype.dtdNData=function(t){return""+t||""},t.prototype.convertAttKey="@",t.prototype.convertPIKey="?",t.prototype.convertTextKey="#text",t.prototype.convertCDataKey="#cdata",t.prototype.convertCommentKey="#comment",t.prototype.convertRawKey="#raw",t.prototype.assertLegalChar=function(t){var e;if(e=t.match(/[\0\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/))throw new Error("Invalid character in string: "+t+" at index "+e.index);return t},t.prototype.elEscape=function(t){var e;return e=this.noDoubleEncoding?/(?!&\S+;)&/g:/&/g,t.replace(e,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\r/g,"&#xD;")},t.prototype.attEscape=function(t){var e;return e=this.noDoubleEncoding?/(?!&\S+;)&/g:/&/g,t.replace(e,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;").replace(/\t/g,"&#x9;").replace(/\n/g,"&#xA;").replace(/\r/g,"&#xD;")},t}()}).call(this)},function(t,e){(function(){var e={}.hasOwnProperty;t.exports=function(){function t(t){var n,r,i,o,s,a,u,c,h;t||(t={}),this.pretty=t.pretty||!1,this.allowEmpty=null!=(r=t.allowEmpty)&&r,this.pretty?(this.indent=null!=(i=t.indent)?i:"  ",this.newline=null!=(o=t.newline)?o:"\n",this.offset=null!=(s=t.offset)?s:0,this.dontprettytextnodes=null!=(a=t.dontprettytextnodes)?a:0):(this.indent="",this.newline="",this.offset=0,this.dontprettytextnodes=0),this.spacebeforeslash=null!=(u=t.spacebeforeslash)?u:"",!0===this.spacebeforeslash&&(this.spacebeforeslash=" "),this.newlinedefault=this.newline,this.prettydefault=this.pretty,c=t.writer||{};for(n in c)e.call(c,n)&&(h=c[n],this[n]=h)}return t.prototype.set=function(t){var n,r,i;t||(t={}),"pretty"in t&&(this.pretty=t.pretty),"allowEmpty"in t&&(this.allowEmpty=t.allowEmpty),this.pretty?(this.indent="indent"in t?t.indent:"  ",this.newline="newline"in t?t.newline:"\n",this.offset="offset"in t?t.offset:0,this.dontprettytextnodes="dontprettytextnodes"in t?t.dontprettytextnodes:0):(this.indent="",this.newline="",this.offset=0,this.dontprettytextnodes=0),this.spacebeforeslash="spacebeforeslash"in t?t.spacebeforeslash:"",!0===this.spacebeforeslash&&(this.spacebeforeslash=" "),this.newlinedefault=this.newline,this.prettydefault=this.pretty,r=t.writer||{};for(n in r)e.call(r,n)&&(i=r[n],this[n]=i);return this},t.prototype.space=function(t){var e;return this.pretty?(e=(t||0)+this.offset+1,e>0?new Array(e).join(this.indent):""):""},t}()}).call(this)},function(t,e){var n={}.toString;t.exports=Array.isArray||function(t){return"[object Array]"==n.call(t)}},function(t,e,n){"use strict";(function(e,r){function i(t){return L.from(t)}function o(t){return L.isBuffer(t)||t instanceof j}function s(t,e,n){if("function"==typeof t.prependListener)return t.prependListener(e,n);t._events&&t._events[e]?F(t._events[e])?t._events[e].unshift(n):t._events[e]=[n,t._events[e]]:t.on(e,n)}function a(t,e){P=P||n(3),t=t||{};var r=e instanceof P;this.objectMode=!!t.objectMode,r&&(this.objectMode=this.objectMode||!!t.readableObjectMode);var i=t.highWaterMark,o=t.readableHighWaterMark,s=this.objectMode?16:16384;this.highWaterMark=i||0===i?i:r&&(o||0===o)?o:s,this.highWaterMark=Math.floor(this.highWaterMark),this.buffer=new V,this.length=0,this.pipes=null,this.pipesCount=0,this.flowing=null,this.ended=!1,this.endEmitted=!1,this.reading=!1,this.sync=!0,this.needReadable=!1,this.emittedReadable=!1,this.readableListening=!1,this.resumeScheduled=!1,this.destroyed=!1,this.defaultEncoding=t.defaultEncoding||"utf8",this.awaitDrain=0,this.readingMore=!1,this.decoder=null,this.encoding=null,t.encoding&&(Y||(Y=n(28).StringDecoder),this.decoder=new Y(t.encoding),this.encoding=t.encoding)}function u(t){if(P=P||n(3),!(this instanceof u))return new u(t);this._readableState=new a(t,this),this.readable=!0,t&&("function"==typeof t.read&&(this._read=t.read),"function"==typeof t.destroy&&(this._destroy=t.destroy)),k.call(this)}function c(t,e,n,r,o){var s=t._readableState;if(null===e)s.reading=!1,y(t,s);else{var a;o||(a=l(s,e)),a?t.emit("error",a):s.objectMode||e&&e.length>0?("string"==typeof e||s.objectMode||Object.getPrototypeOf(e)===L.prototype||(e=i(e)),r?s.endEmitted?t.emit("error",new Error("stream.unshift() after end event")):h(t,s,e,!0):s.ended?t.emit("error",new Error("stream.push() after EOF")):(s.reading=!1,s.decoder&&!n?(e=s.decoder.write(e),s.objectMode||0!==e.length?h(t,s,e,!1):w(t,s)):h(t,s,e,!1))):r||(s.reading=!1)}return f(s)}function h(t,e,n,r){e.flowing&&0===e.length&&!e.sync?(t.emit("data",n),t.read(0)):(e.length+=e.objectMode?1:n.length,r?e.buffer.unshift(n):e.buffer.push(n),e.needReadable&&g(t)),w(t,e)}function l(t,e){var n;return o(e)||"string"==typeof e||void 0===e||t.objectMode||(n=new TypeError("Invalid non-string/buffer chunk")),n}function f(t){return!t.ended&&(t.needReadable||t.length<t.highWaterMark||0===t.length)}function p(t){return t>=H?t=H:(t--,t|=t>>>1,t|=t>>>2,t|=t>>>4,t|=t>>>8,t|=t>>>16,t++),t}function d(t,e){return t<=0||0===e.length&&e.ended?0:e.objectMode?1:t!==t?e.flowing&&e.length?e.buffer.head.data.length:e.length:(t>e.highWaterMark&&(e.highWaterMark=p(t)),t<=e.length?t:e.ended?e.length:(e.needReadable=!0,0))}function y(t,e){if(!e.ended){if(e.decoder){var n=e.decoder.end();n&&n.length&&(e.buffer.push(n),e.length+=e.objectMode?1:n.length)}e.ended=!0,g(t)}}function g(t){var e=t._readableState;e.needReadable=!1,e.emittedReadable||(q("emitReadable",e.flowing),e.emittedReadable=!0,e.sync?N(m,t):m(t))}function m(t){q("emit readable"),t.emit("readable"),T(t)}function w(t,e){e.readingMore||(e.readingMore=!0,N(v,t,e))}function v(t,e){for(var n=e.length;!e.reading&&!e.flowing&&!e.ended&&e.length<e.highWaterMark&&(q("maybeReadMore read 0"),t.read(0),n!==e.length);)n=e.length;e.readingMore=!1}function b(t){return function(){var e=t._readableState;q("pipeOnDrain",e.awaitDrain),e.awaitDrain&&e.awaitDrain--,0===e.awaitDrain&&R(t,"data")&&(e.flowing=!0,T(t))}}function _(t){q("readable nexttick read 0"),t.read(0)}function E(t,e){e.resumeScheduled||(e.resumeScheduled=!0,N(A,t,e))}function A(t,e){e.reading||(q("resume read 0"),t.read(0)),e.resumeScheduled=!1,e.awaitDrain=0,t.emit("resume"),T(t),e.flowing&&!e.reading&&t.read(0)}function T(t){var e=t._readableState;for(q("flow",e.flowing);e.flowing&&null!==t.read(););}function D(t,e){if(0===e.length)return null;var n;return e.objectMode?n=e.buffer.shift():!t||t>=e.length?(n=e.decoder?e.buffer.join(""):1===e.buffer.length?e.buffer.head.data:e.buffer.concat(e.length),e.buffer.clear()):n=C(t,e.buffer,e.decoder),n}function C(t,e,n){var r;return t<e.head.data.length?(r=e.head.data.slice(0,t),e.head.data=e.head.data.slice(t)):r=t===e.head.data.length?e.shift():n?x(t,e):S(t,e),r}function x(t,e){var n=e.head,r=1,i=n.data;for(t-=i.length;n=n.next;){var o=n.data,s=t>o.length?o.length:t;if(s===o.length?i+=o:i+=o.slice(0,t),0===(t-=s)){s===o.length?(++r,n.next?e.head=n.next:e.head=e.tail=null):(e.head=n,n.data=o.slice(s));break}++r}return e.length-=r,i}function S(t,e){var n=L.allocUnsafe(t),r=e.head,i=1;for(r.data.copy(n),t-=r.data.length;r=r.next;){var o=r.data,s=t>o.length?o.length:t;if(o.copy(n,n.length-t,0,s),0===(t-=s)){s===o.length?(++i,r.next?e.head=r.next:e.head=e.tail=null):(e.head=r,r.data=o.slice(s));break}++i}return e.length-=i,n}function I(t){var e=t._readableState;if(e.length>0)throw new Error('"endReadable()" called on non-empty stream');e.endEmitted||(e.ended=!0,N(O,e,t))}function O(t,e){t.endEmitted||0!==t.length||(t.endEmitted=!0,e.readable=!1,e.emit("end"))}function B(t,e){for(var n=0,r=t.length;n<r;n++)if(t[n]===e)return n;return-1}var N=n(21).nextTick;t.exports=u;var P,F=n(34);u.ReadableState=a;var R=(n(19).EventEmitter,function(t,e){return t.listeners(e).length}),k=n(36),L=n(22).Buffer,j=e.Uint8Array||function(){},M=n(6);M.inherits=n(5);var U=n(73),q=void 0;q=U&&U.debuglog?U.debuglog("stream"):function(){};var Y,V=n(74),G=n(37);M.inherits(u,k);var X=["error","close","destroy","pause","resume"];Object.defineProperty(u.prototype,"destroyed",{get:function(){return void 0!==this._readableState&&this._readableState.destroyed},set:function(t){this._readableState&&(this._readableState.destroyed=t)}}),u.prototype.destroy=G.destroy,u.prototype._undestroy=G.undestroy,u.prototype._destroy=function(t,e){this.push(null),e(t)},u.prototype.push=function(t,e){var n,r=this._readableState;return r.objectMode?n=!0:"string"==typeof t&&(e=e||r.defaultEncoding,e!==r.encoding&&(t=L.from(t,e),e=""),n=!0),c(this,t,e,!1,n)},u.prototype.unshift=function(t){return c(this,t,null,!0,!1)},u.prototype.isPaused=function(){return!1===this._readableState.flowing},u.prototype.setEncoding=function(t){return Y||(Y=n(28).StringDecoder),this._readableState.decoder=new Y(t),this._readableState.encoding=t,this};var H=8388608;u.prototype.read=function(t){q("read",t),t=parseInt(t,10);var e=this._readableState,n=t;if(0!==t&&(e.emittedReadable=!1),0===t&&e.needReadable&&(e.length>=e.highWaterMark||e.ended))return q("read: emitReadable",e.length,e.ended),0===e.length&&e.ended?I(this):g(this),null;if(0===(t=d(t,e))&&e.ended)return 0===e.length&&I(this),null;var r=e.needReadable;q("need readable",r),(0===e.length||e.length-t<e.highWaterMark)&&(r=!0,q("length less than watermark",r)),e.ended||e.reading?(r=!1,q("reading or ended",r)):r&&(q("do read"),e.reading=!0,e.sync=!0,0===e.length&&(e.needReadable=!0),this._read(e.highWaterMark),e.sync=!1,e.reading||(t=d(n,e)));var i;return i=t>0?D(t,e):null,null===i?(e.needReadable=!0,t=0):e.length-=t,0===e.length&&(e.ended||(e.needReadable=!0),n!==t&&e.ended&&I(this)),null!==i&&this.emit("data",i),i},u.prototype._read=function(t){this.emit("error",new Error("_read() is not implemented"))},u.prototype.pipe=function(t,e){function n(t,e){q("onunpipe"),t===f&&e&&!1===e.hasUnpiped&&(e.hasUnpiped=!0,o())}function i(){q("onend"),t.end()}function o(){q("cleanup"),t.removeListener("close",c),t.removeListener("finish",h),t.removeListener("drain",g),t.removeListener("error",u),t.removeListener("unpipe",n),f.removeListener("end",i),f.removeListener("end",l),f.removeListener("data",a),m=!0,!p.awaitDrain||t._writableState&&!t._writableState.needDrain||g()}function a(e){q("ondata"),w=!1,!1!==t.write(e)||w||((1===p.pipesCount&&p.pipes===t||p.pipesCount>1&&-1!==B(p.pipes,t))&&!m&&(q("false write response, pause",f._readableState.awaitDrain),f._readableState.awaitDrain++,w=!0),f.pause())}function u(e){q("onerror",e),l(),t.removeListener("error",u),0===R(t,"error")&&t.emit("error",e)}function c(){t.removeListener("finish",h),l()}function h(){q("onfinish"),t.removeListener("close",c),l()}function l(){q("unpipe"),f.unpipe(t)}var f=this,p=this._readableState;switch(p.pipesCount){case 0:p.pipes=t;break;case 1:p.pipes=[p.pipes,t];break;default:p.pipes.push(t)}p.pipesCount+=1,q("pipe count=%d opts=%j",p.pipesCount,e);var d=(!e||!1!==e.end)&&t!==r.stdout&&t!==r.stderr,y=d?i:l;p.endEmitted?N(y):f.once("end",y),t.on("unpipe",n);var g=b(f);t.on("drain",g);var m=!1,w=!1;return f.on("data",a),s(t,"error",u),t.once("close",c),t.once("finish",h),t.emit("pipe",f),p.flowing||(q("pipe resume"),f.resume()),t},u.prototype.unpipe=function(t){var e=this._readableState,n={hasUnpiped:!1};if(0===e.pipesCount)return this;if(1===e.pipesCount)return t&&t!==e.pipes?this:(t||(t=e.pipes),e.pipes=null,e.pipesCount=0,e.flowing=!1,t&&t.emit("unpipe",this,n),this);if(!t){var r=e.pipes,i=e.pipesCount;e.pipes=null,e.pipesCount=0,e.flowing=!1;for(var o=0;o<i;o++)r[o].emit("unpipe",this,n);return this}var s=B(e.pipes,t);return-1===s?this:(e.pipes.splice(s,1),e.pipesCount-=1,1===e.pipesCount&&(e.pipes=e.pipes[0]),t.emit("unpipe",this,n),this)},u.prototype.on=function(t,e){var n=k.prototype.on.call(this,t,e);if("data"===t)!1!==this._readableState.flowing&&this.resume();else if("readable"===t){var r=this._readableState;r.endEmitted||r.readableListening||(r.readableListening=r.needReadable=!0,r.emittedReadable=!1,r.reading?r.length&&g(this):N(_,this))}return n},u.prototype.addListener=u.prototype.on,u.prototype.resume=function(){var t=this._readableState;return t.flowing||(q("resume"),t.flowing=!0,E(this,t)),this},u.prototype.pause=function(){return q("call pause flowing=%j",this._readableState.flowing),!1!==this._readableState.flowing&&(q("pause"),this._readableState.flowing=!1,this.emit("pause")),this},u.prototype.wrap=function(t){var e=this,n=this._readableState,r=!1;t.on("end",function(){if(q("wrapped end"),n.decoder&&!n.ended){var t=n.decoder.end();t&&t.length&&e.push(t)}e.push(null)}),t.on("data",function(i){if(q("wrapped data"),n.decoder&&(i=n.decoder.write(i)),(!n.objectMode||null!==i&&void 0!==i)&&(n.objectMode||i&&i.length)){e.push(i)||(r=!0,t.pause())}});for(var i in t)void 0===this[i]&&"function"==typeof t[i]&&(this[i]=function(e){return function(){return t[e].apply(t,arguments)}}(i));for(var o=0;o<X.length;o++)t.on(X[o],this.emit.bind(this,X[o]));return this._read=function(e){q("wrapped _read",e),r&&(r=!1,t.resume())},this},u._fromList=D}).call(e,n(1),n(20))},function(t,e,n){t.exports=n(19).EventEmitter},function(t,e,n){"use strict";function r(t,e){var n=this,r=this._readableState&&this._readableState.destroyed,i=this._writableState&&this._writableState.destroyed;return r||i?(e?e(t):!t||this._writableState&&this._writableState.errorEmitted||s(o,this,t),this):(this._readableState&&(this._readableState.destroyed=!0),this._writableState&&(this._writableState.destroyed=!0),this._destroy(t||null,function(t){!e&&t?(s(o,n,t),n._writableState&&(n._writableState.errorEmitted=!0)):e&&e(t)}),this)}function i(){this._readableState&&(this._readableState.destroyed=!1,this._readableState.reading=!1,this._readableState.ended=!1,this._readableState.endEmitted=!1),this._writableState&&(this._writableState.destroyed=!1,this._writableState.ended=!1,this._writableState.ending=!1,this._writableState.finished=!1,this._writableState.errorEmitted=!1)}function o(t,e){t.emit("error",e)}var s=n(21).nextTick;t.exports={destroy:r,undestroy:i}},function(t,e,n){(function(t){function r(t,e){this._id=t,this._clearFn=e}var i=Function.prototype.apply;e.setTimeout=function(){return new r(i.call(setTimeout,window,arguments),clearTimeout)},e.setInterval=function(){return new r(i.call(setInterval,window,arguments),clearInterval)},e.clearTimeout=e.clearInterval=function(t){t&&t.close()},r.prototype.unref=r.prototype.ref=function(){},r.prototype.close=function(){this._clearFn.call(window,this._id)},e.enroll=function(t,e){clearTimeout(t._idleTimeoutId),t._idleTimeout=e},e.unenroll=function(t){clearTimeout(t._idleTimeoutId),t._idleTimeout=-1},e._unrefActive=e.active=function(t){clearTimeout(t._idleTimeoutId);var e=t._idleTimeout;e>=0&&(t._idleTimeoutId=setTimeout(function(){t._onTimeout&&t._onTimeout()},e))},n(76),e.setImmediate="undefined"!=typeof self&&self.setImmediate||void 0!==t&&t.setImmediate||this&&this.setImmediate,e.clearImmediate="undefined"!=typeof self&&self.clearImmediate||void 0!==t&&t.clearImmediate||this&&this.clearImmediate}).call(e,n(1))},function(t,e,n){"use strict";function r(t,e){var n=this._transformState;n.transforming=!1;var r=n.writecb;if(!r)return this.emit("error",new Error("write callback called multiple times"));n.writechunk=null,n.writecb=null,null!=e&&this.push(e),r(t);var i=this._readableState;i.reading=!1,(i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}function i(t){if(!(this instanceof i))return new i(t);a.call(this,t),this._transformState={afterTransform:r.bind(this),needTransform:!1,transforming:!1,writecb:null,writechunk:null,writeencoding:null},this._readableState.needReadable=!0,this._readableState.sync=!1,t&&("function"==typeof t.transform&&(this._transform=t.transform),"function"==typeof t.flush&&(this._flush=t.flush)),this.on("prefinish",o)}function o(){var t=this;"function"==typeof this._flush?this._flush(function(e,n){s(t,e,n)}):s(this,null,null)}function s(t,e,n){if(e)return t.emit("error",e);if(null!=n&&t.push(n),t._writableState.length)throw new Error("Calling transform done when ws.length != 0");if(t._transformState.transforming)throw new Error("Calling transform done when still transforming");return t.push(null)}t.exports=i;var a=n(3),u=n(6);u.inherits=n(5),u.inherits(i,a),i.prototype.push=function(t,e){return this._transformState.needTransform=!1,a.prototype.push.call(this,t,e)},i.prototype._transform=function(t,e,n){throw new Error("_transform() is not implemented")},i.prototype._write=function(t,e,n){var r=this._transformState;if(r.writecb=n,r.writechunk=t,r.writeencoding=e,!r.transforming){var i=this._readableState;(r.needTransform||i.needReadable||i.length<i.highWaterMark)&&this._read(i.highWaterMark)}},i.prototype._read=function(t){var e=this._transformState;null!==e.writechunk&&e.writecb&&!e.transforming?(e.transforming=!0,this._transform(e.writechunk,e.writeencoding,e.afterTransform)):e.needTransform=!0},i.prototype._destroy=function(t,e){var n=this;a.prototype._destroy.call(this,t,function(t){e(t),n.emit("close")})}},function(t,e){(function(){"use strict";var t;t=new RegExp(/(?!xmlns)^.*:/),e.normalize=function(t){return t.toLowerCase()},e.firstCharLowerCase=function(t){return t.charAt(0).toLowerCase()+t.slice(1)},e.stripPrefix=function(e){return e.replace(t,"")},e.parseNumbers=function(t){return isNaN(t)||(t=t%1==0?parseInt(t,10):parseFloat(t)),t},e.parseBooleans=function(t){return/^(?:true|false)$/i.test(t)&&(t="true"===t.toLowerCase()),t}}).call(this)},function(t,e,n){"use strict";function r(t){return t&&t.__esModule?t:{default:t}}function i(t){if(Array.isArray(t)){for(var e=0,n=Array(t.length);e<t.length;e++)n[e]=t[e];return n}return Array.from(t)}function o(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}Object.defineProperty(e,"__esModule",{value:!0});var s=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t},a=function(){function t(t,e){for(var n=0;n<e.length;n++){var r=e[n];r.enumerable=r.enumerable||!1,r.configurable=!0,"value"in r&&(r.writable=!0),Object.defineProperty(t,r.key,r)}}return function(e,n,r){return n&&t(e.prototype,n),r&&t(e,r),e}}(),u=n(42),c=r(u),h=n(57),l=r(h),f=n(58),p=n(30),d=n(59),y=function(){function t(){var e=arguments.length>0&&void 0!==arguments[0]?arguments[0]:{};o(this,t),this._options=s({},l.default,e),this._options.endpoint=(0,p.removeTrailingSlashes)(this._options.endpoint),this._auth=(0,c.default)({url:this._options.endpoint,oauth_consumer_key:this._options.oauthConsumerKey,oauth_secret:this._options.oauthSecret,oauth_token:this._options.oauthUserToken,oauth_token_secret:this._options.oauthUserTokenSecret})}return a(t,[{key:"fetchNotes",value:function(t,e,n,r){var i=arguments.length>4&&void 0!==arguments[4]?arguments[4]:null,o=arguments.length>5&&void 0!==arguments[5]?arguments[5]:null;return(0,d.fetchNotesRequest)(this.endpoint,t,e,n,r,i,o)}},{key:"createChangeset",value:function(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return(0,d.createChangesetRequest)(this._auth,this.endpoint,t,e)}},{key:"isChangesetStillOpen",value:function(t){return(0,d.changesetCheckRequest)(this._auth,this.endpoint,t)}},{key:"createNodeElement",value:function(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:{},r={osm:{$:{},node:[{$:{visible:"true",version:"1"},tag:[]}]},_type:"node"};return r.osm.node[0].tag=Object.keys(n).map(function(t){return{$:{k:t.toString(),v:n[t].toString()}}}),r}},{key:"fetchElement",value:function(t){return(0,d.fetchElementRequest)(this.endpoint,t)}},{key:"fetchWaysForNode",value:function(t){return(0,d.fetchWaysForNodeRequest)(this.endpoint,t)}},{key:"setProperty",value:function(t,e,n){var r=t._type,o=(0,p.simpleObjectDeepClone)(t),s=o.osm[r][0],a=s.tag?s.tag.filter(function(t){return t.$.k!==e.toString()}):[];return s.tag=[].concat(i(a),[{$:{k:e.toString(),v:n.toString()}}]),o}},{key:"setProperties",value:function(t,e){var n=(0,p.simpleObjectDeepClone)(t),r=(0,p.simpleObjectDeepClone)(e),o=Object.keys(r),s=t._type,a=n.osm[s][0],u=a.tag?a.tag.filter(function(t){return!o.includes(t.$.k)}):[],c=o.map(function(t){return{$:{k:t.toString(),v:r[t].toString()}}});return a.tag=[].concat(i(u),i(c)),n}},{key:"removeProperty",value:function(t,e){var n=t._type,r=(0,p.simpleObjectDeepClone)(t),i=r.osm[n][0],o=i.tag.filter(function(t){return t.$.k!==e});return i.tag=o,r}},{key:"setCoordinates",value:function(t,e,n){var r=t._type,i=(0,p.simpleObjectDeepClone)(t);return i.osm[r][0].$.lat=e.toString(),i.osm[r][0].$.lon=n.toString(),i}},{key:"setTimestampToNow",value:function(t){var e=t._type,n=(0,p.simpleObjectDeepClone)(t);return n.osm[e][0].$.timestamp=(0,f.getCurrentIsoTimestamp)(),n}},{key:"setVersion",value:function(t,e){var n=t._type,r=(0,p.simpleObjectDeepClone)(t);return r.osm[n][0].$.version=parseInt(e).toString(),r}},{key:"sendElement",value:function(t,e){return(0,d.sendElementRequest)(this._auth,this.endpoint,t,e)}},{key:"endpoint",get:function(){return this._options.endpoint}}]),t}();e.default=y},function(t,e,n){"use strict";var r=n(43),i=n(45),o=n(46),s=n(29);t.exports=function(t){function e(t){return t.oauth_timestamp=r.timestamp(),t.oauth_nonce=r.nonce(),t}function n(t){return{oauth_consumer_key:t.oauth_consumer_key,oauth_signature_method:"HMAC-SHA1"}}var a={};a.authenticated=function(){return!(!u("oauth_token")||!u("oauth_token_secret"))},a.logout=function(){return u("oauth_token",""),u("oauth_token_secret",""),u("oauth_request_token_secret",""),a},a.authenticate=function(o){function s(e,n){if(t.done(),e)return o(e);var s=r.stringQs(n.response);u("oauth_request_token_secret",s.oauth_token_secret);var a=t.url+"/oauth/authorize?"+r.qsString({oauth_token:s.oauth_token,oauth_callback:i(t.landing)});t.singlepage?location.href=a:d.location=a}function c(i){var o=t.url+"/oauth/access_token",s=e(n(t)),a=u("oauth_request_token_secret");s.oauth_token=i,s.oauth_signature=r.signature(t.oauth_secret,a,r.baseString("POST",o,s)),r.xhr("POST",o,s,null,{},h),t.loading()}function h(e,n){if(t.done(),e)return o(e);var i=r.stringQs(n.response);u("oauth_token",i.oauth_token),u("oauth_token_secret",i.oauth_token_secret),o(null,a)}if(a.authenticated())return o();a.logout();var l=e(n(t)),f=t.url+"/oauth/request_token";if(l.oauth_signature=r.signature(t.oauth_secret,"",r.baseString("POST",f,l)),!t.singlepage)var p=[["width",600],["height",550],["left",screen.width/2-300],["top",screen.height/2-275]].map(function(t){return t.join("=")}).join(","),d=window.open("about:blank","oauth_window",p);r.xhr("POST",f,l,null,{},s),t.loading(),window.authComplete=function(t){c(r.stringQs(t.split("?")[1]).oauth_token),delete window.authComplete}},a.bootstrapToken=function(i,o){function s(e,n){if(t.done(),e)return o(e);var i=r.stringQs(n.response);u("oauth_token",i.oauth_token),u("oauth_token_secret",i.oauth_token_secret),o(null,a)}!function(i){var o=t.url+"/oauth/access_token",a=e(n(t)),c=u("oauth_request_token_secret");a.oauth_token=i,a.oauth_signature=r.signature(t.oauth_secret,c,r.baseString("POST",o,a)),r.xhr("POST",o,a,null,{},s),t.loading()}(i)},a.xhr=function(i,o){function c(){var o=e(n(t)),a=u("oauth_token_secret"),c=!1!==i.prefix?t.url+i.path:i.path,l=c.replace(/#.*$/,"").split("?",2),f=l[0],p=2===l.length?l[1]:"";return i.options&&i.options.header&&"application/x-www-form-urlencoded"!==i.options.header["Content-Type"]||!i.content||(o=s(o,r.stringQs(i.content))),o.oauth_token=u("oauth_token"),o.oauth_signature=r.signature(t.oauth_secret,a,r.baseString(i.method,f,s(o,r.stringQs(p)))),r.xhr(i.method,c,o,i.content,i.options,h)}function h(t,e){return t?o(t):e.responseXML?o(t,e.responseXML):o(t,e.response)}return a.authenticated()?c():t.auto?a.authenticate(c):void o("not authenticated",null)},a.preauth=function(t){if(t)return t.oauth_token&&u("oauth_token",t.oauth_token),t.oauth_token_secret&&u("oauth_token_secret",t.oauth_token_secret),a},a.options=function(e){return arguments.length?(t=e,t.url=t.url||"https://www.openstreetmap.org",t.landing=t.landing||"land.html",t.singlepage=t.singlepage||!1,t.loading=t.loading||function(){},t.done=t.done||function(){},a.preauth(t)):t};var u;if(o.enabled)u=function(e,n){return 1===arguments.length?o.get(t.url+e):2===arguments.length?o.set(t.url+e,n):void 0};else{var c={};u=function(e,n){return 1===arguments.length?c[t.url+e]:2===arguments.length?c[t.url+e]=n:void 0}}return a.options(t),a}},function(t,e,n){"use strict";var r=n(44),i=n(29),o=new r.SHA1,s={};s.qsString=function(t){return Object.keys(t).sort().map(function(e){return s.percentEncode(e)+"="+s.percentEncode(t[e])}).join("&")},s.stringQs=function(t){return t.split("&").filter(function(t){return""!==t}).reduce(function(t,e){var n=e.split("=");return t[decodeURIComponent(n[0])]=null===n[1]?"":decodeURIComponent(n[1]),t},{})},s.rawxhr=function(t,e,n,r,i){var o=new XMLHttpRequest,s=/^20\d$/;o.onreadystatechange=function(){if(4===o.readyState&&0!==o.status){if(!s.test(o.status))return i(o,null);i(null,o)}},o.onerror=function(t){return i(t,null)},o.open(t,e,!0);for(var a in r)o.setRequestHeader(a,r[a]);return o.send(n),o},s.xhr=function(t,e,n,r,i,o){var a=i&&i.header||{"Content-Type":"application/x-www-form-urlencoded"};return a.Authorization="OAuth "+s.authHeader(n),s.rawxhr(t,e,r,a,o)},s.nonce=function(){for(var t="";t.length<6;)t+="0123456789ABCDEFGHIJKLMNOPQRSTUVWXTZabcdefghiklmnopqrstuvwxyz"[Math.floor(61*Math.random())];return t},s.authHeader=function(t){return Object.keys(t).sort().map(function(e){return encodeURIComponent(e)+'="'+encodeURIComponent(t[e])+'"'}).join(", ")},s.timestamp=function(){return~~(+new Date/1e3)},s.percentEncode=function(t){return encodeURIComponent(t).replace(/\!/g,"%21").replace(/\'/g,"%27").replace(/\*/g,"%2A").replace(/\(/g,"%28").replace(/\)/g,"%29")},s.baseString=function(t,e,n){return n.oauth_signature&&delete n.oauth_signature,[t,s.percentEncode(e),s.percentEncode(s.qsString(n))].join("&")},s.signature=function(t,e,n){return o.b64_hmac(s.percentEncode(t)+"&"+s.percentEncode(e),n)},s.headerGenerator=function(t){t=t||{};var e=t.consumer_key||"",n=t.consumer_secret||"",r=t.signature_method||"HMAC-SHA1",o=t.version||"1.0",a=t.token||"",u=t.token_secret||"";return function(t,c,h){t=t.toUpperCase(),"string"==typeof h&&h.length>0&&(h=s.stringQs(h));var l=c.split("?",2),f=l[0],p=2===l.length?s.stringQs(l[1]):{},d={oauth_consumer_key:e,oauth_signature_method:r,oauth_version:o,oauth_timestamp:s.timestamp(),oauth_nonce:s.nonce()};a&&(d.oauth_token=a);var y=i({},d,p,h),g=s.baseString(t,f,y);return d.oauth_signature=s.signature(n,u,g),"OAuth "+s.authHeader(d)}},t.exports=s},function(t,e,n){(function(r){var i;!function(){function o(t){var e,n,r,i="",o=-1;if(t&&t.length)for(r=t.length;(o+=1)<r;)e=t.charCodeAt(o),n=o+1<r?t.charCodeAt(o+1):0,55296<=e&&e<=56319&&56320<=n&&n<=57343&&(e=65536+((1023&e)<<10)+(1023&n),o+=1),e<=127?i+=String.fromCharCode(e):e<=2047?i+=String.fromCharCode(192|e>>>6&31,128|63&e):e<=65535?i+=String.fromCharCode(224|e>>>12&15,128|e>>>6&63,128|63&e):e<=2097151&&(i+=String.fromCharCode(240|e>>>18&7,128|e>>>12&63,128|e>>>6&63,128|63&e));return i}function s(t){var e,n,r,i,o,s,a=[];if(e=n=r=i=o=0,t&&t.length)for(s=t.length,t+="";e<s;)r=t.charCodeAt(e),n+=1,r<128?(a[n]=String.fromCharCode(r),e+=1):r>191&&r<224?(i=t.charCodeAt(e+1),a[n]=String.fromCharCode((31&r)<<6|63&i),e+=2):(i=t.charCodeAt(e+1),o=t.charCodeAt(e+2),a[n]=String.fromCharCode((15&r)<<12|(63&i)<<6|63&o),e+=3);return a.join("")}function a(t,e){var n=(65535&t)+(65535&e);return(t>>16)+(e>>16)+(n>>16)<<16|65535&n}function u(t,e){return t<<e|t>>>32-e}function c(t,e){for(var n,r=e?"0123456789ABCDEF":"0123456789abcdef",i="",o=0,s=t.length;o<s;o+=1)n=t.charCodeAt(o),i+=r.charAt(n>>>4&15)+r.charAt(15&n);return i}function h(t){var e,n=32*t.length,r="";for(e=0;e<n;e+=8)r+=String.fromCharCode(t[e>>5]>>>24-e%32&255);return r}function l(t){var e,n=32*t.length,r="";for(e=0;e<n;e+=8)r+=String.fromCharCode(t[e>>5]>>>e%32&255);return r}function f(t){var e,n=8*t.length,r=Array(t.length>>2),i=r.length;for(e=0;e<i;e+=1)r[e]=0;for(e=0;e<n;e+=8)r[e>>5]|=(255&t.charCodeAt(e/8))<<e%32;return r}function p(t){var e,n=8*t.length,r=Array(t.length>>2),i=r.length;for(e=0;e<i;e+=1)r[e]=0;for(e=0;e<n;e+=8)r[e>>5]|=(255&t.charCodeAt(e/8))<<24-e%32;return r}function d(t,e){var n,r,i,o,s,a,u,c,h=e.length,l=Array();for(a=Array(Math.ceil(t.length/2)),o=a.length,n=0;n<o;n+=1)a[n]=t.charCodeAt(2*n)<<8|t.charCodeAt(2*n+1);for(;a.length>0;){for(s=Array(),i=0,n=0;n<a.length;n+=1)i=(i<<16)+a[n],r=Math.floor(i/h),i-=r*h,(s.length>0||r>0)&&(s[s.length]=r);l[l.length]=i,a=s}for(u="",n=l.length-1;n>=0;n--)u+=e.charAt(l[n]);for(c=Math.ceil(8*t.length/(Math.log(e.length)/Math.log(2))),n=u.length;n<c;n+=1)u=e[0]+u;return u}function y(t,e){var n,r,i,o="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",s="",a=t.length;for(e=e||"=",n=0;n<a;n+=3)for(i=t.charCodeAt(n)<<16|(n+1<a?t.charCodeAt(n+1)<<8:0)|(n+2<a?t.charCodeAt(n+2):0),r=0;r<4;r+=1)8*n+6*r>8*t.length?s+=e:s+=o.charAt(i>>>6*(3-r)&63);return s}var g;g={VERSION:"1.0.6",Base64:function(){var t="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",e="=",n=!0;this.encode=function(r){var i,s,a,u="",c=r.length;for(e=e||"=",r=n?o(r):r,i=0;i<c;i+=3)for(a=r.charCodeAt(i)<<16|(i+1<c?r.charCodeAt(i+1)<<8:0)|(i+2<c?r.charCodeAt(i+2):0),s=0;s<4;s+=1)u+=8*i+6*s>8*c?e:t.charAt(a>>>6*(3-s)&63);return u},this.decode=function(r){var i,o,a,u,c,h,l,f,p,d,y="",g=[];if(!r)return r;i=d=0,r=r.replace(new RegExp("\\"+e,"gi"),"");do{c=t.indexOf(r.charAt(i+=1)),h=t.indexOf(r.charAt(i+=1)),l=t.indexOf(r.charAt(i+=1)),f=t.indexOf(r.charAt(i+=1)),p=c<<18|h<<12|l<<6|f,o=p>>16&255,a=p>>8&255,u=255&p,d+=1,g[d]=64===l?String.fromCharCode(o):64===f?String.fromCharCode(o,a):String.fromCharCode(o,a,u)}while(i<r.length);return y=g.join(""),y=n?s(y):y},this.setPad=function(t){return e=t||e,this},this.setTab=function(e){return t=e||t,this},this.setUTF8=function(t){return"boolean"==typeof t&&(n=t),this}},CRC32:function(t){var e,n,r,i=0,s=0,a=0;for(t=o(t),e=["00000000 77073096 EE0E612C 990951BA 076DC419 706AF48F E963A535 9E6495A3 0EDB8832 ","79DCB8A4 E0D5E91E 97D2D988 09B64C2B 7EB17CBD E7B82D07 90BF1D91 1DB71064 6AB020F2 F3B97148 ","84BE41DE 1ADAD47D 6DDDE4EB F4D4B551 83D385C7 136C9856 646BA8C0 FD62F97A 8A65C9EC 14015C4F ","63066CD9 FA0F3D63 8D080DF5 3B6E20C8 4C69105E D56041E4 A2677172 3C03E4D1 4B04D447 D20D85FD ","A50AB56B 35B5A8FA 42B2986C DBBBC9D6 ACBCF940 32D86CE3 45DF5C75 DCD60DCF ABD13D59 26D930AC ","51DE003A C8D75180 BFD06116 21B4F4B5 56B3C423 CFBA9599 B8BDA50F 2802B89E 5F058808 C60CD9B2 ","B10BE924 2F6F7C87 58684C11 C1611DAB B6662D3D 76DC4190 01DB7106 98D220BC EFD5102A 71B18589 ","06B6B51F 9FBFE4A5 E8B8D433 7807C9A2 0F00F934 9609A88E E10E9818 7F6A0DBB 086D3D2D 91646C97 ","E6635C01 6B6B51F4 1C6C6162 856530D8 F262004E 6C0695ED 1B01A57B 8208F4C1 F50FC457 65B0D9C6 ","12B7E950 8BBEB8EA FCB9887C 62DD1DDF 15DA2D49 8CD37CF3 FBD44C65 4DB26158 3AB551CE A3BC0074 ","D4BB30E2 4ADFA541 3DD895D7 A4D1C46D D3D6F4FB 4369E96A 346ED9FC AD678846 DA60B8D0 44042D73 ","33031DE5 AA0A4C5F DD0D7CC9 5005713C 270241AA BE0B1010 C90C2086 5768B525 206F85B3 B966D409 ","CE61E49F 5EDEF90E 29D9C998 B0D09822 C7D7A8B4 59B33D17 2EB40D81 B7BD5C3B C0BA6CAD EDB88320 ","9ABFB3B6 03B6E20C 74B1D29A EAD54739 9DD277AF 04DB2615 73DC1683 E3630B12 94643B84 0D6D6A3E ","7A6A5AA8 E40ECF0B 9309FF9D 0A00AE27 7D079EB1 F00F9344 8708A3D2 1E01F268 6906C2FE F762575D ","806567CB 196C3671 6E6B06E7 FED41B76 89D32BE0 10DA7A5A 67DD4ACC F9B9DF6F 8EBEEFF9 17B7BE43 ","60B08ED5 D6D6A3E8 A1D1937E 38D8C2C4 4FDFF252 D1BB67F1 A6BC5767 3FB506DD 48B2364B D80D2BDA ","AF0A1B4C 36034AF6 41047A60 DF60EFC3 A867DF55 316E8EEF 4669BE79 CB61B38C BC66831A 256FD2A0 ","5268E236 CC0C7795 BB0B4703 220216B9 5505262F C5BA3BBE B2BD0B28 2BB45A92 5CB36A04 C2D7FFA7 ","B5D0CF31 2CD99E8B 5BDEAE1D 9B64C2B0 EC63F226 756AA39C 026D930A 9C0906A9 EB0E363F 72076785 ","05005713 95BF4A82 E2B87A14 7BB12BAE 0CB61B38 92D28E9B E5D5BE0D 7CDCEFB7 0BDBDF21 86D3D2D4 ","F1D4E242 68DDB3F8 1FDA836E 81BE16CD F6B9265B 6FB077E1 18B74777 88085AE6 FF0F6A70 66063BCA ","11010B5C 8F659EFF F862AE69 616BFFD3 166CCF45 A00AE278 D70DD2EE 4E048354 3903B3C2 A7672661 ","D06016F7 4969474D 3E6E77DB AED16A4A D9D65ADC 40DF0B66 37D83BF0 A9BCAE53 DEBB9EC5 47B2CF7F ","30B5FFE9 BDBDF21C CABAC28A 53B39330 24B4A3A6 BAD03605 CDD70693 54DE5729 23D967BF B3667A2E ","C4614AB8 5D681B02 2A6F2B94 B40BBE37 C30C8EA1 5A05DF1B 2D02EF8D"].join(""),i^=-1,n=0,r=t.length;n<r;n+=1)a=255&(i^t.charCodeAt(n)),s="0x"+e.substr(9*a,8),i=i>>>8^s;return(-1^i)>>>0},MD5:function(t){function e(t){return t=v?o(t):t,l(r(f(t),8*t.length))}function n(t,e){var n,i,s,a,u;for(t=v?o(t):t,e=v?o(e):e,n=f(t),n.length>16&&(n=r(n,8*t.length)),i=Array(16),s=Array(16),u=0;u<16;u+=1)i[u]=909522486^n[u],s[u]=1549556828^n[u];return a=r(i.concat(f(e)),512+8*e.length),l(r(s.concat(a),640))}function r(t,e){var n,r,i,o,u,c=1732584193,l=-271733879,f=-1732584194,d=271733878;for(t[e>>5]|=128<<e%32,t[14+(e+64>>>9<<4)]=e,n=0;n<t.length;n+=16)r=c,i=l,o=f,u=d,c=s(c,l,f,d,t[n+0],7,-680876936),d=s(d,c,l,f,t[n+1],12,-389564586),f=s(f,d,c,l,t[n+2],17,606105819),l=s(l,f,d,c,t[n+3],22,-1044525330),c=s(c,l,f,d,t[n+4],7,-176418897),d=s(d,c,l,f,t[n+5],12,1200080426),f=s(f,d,c,l,t[n+6],17,-1473231341),l=s(l,f,d,c,t[n+7],22,-45705983),c=s(c,l,f,d,t[n+8],7,1770035416),d=s(d,c,l,f,t[n+9],12,-1958414417),f=s(f,d,c,l,t[n+10],17,-42063),l=s(l,f,d,c,t[n+11],22,-1990404162),c=s(c,l,f,d,t[n+12],7,1804603682),d=s(d,c,l,f,t[n+13],12,-40341101),f=s(f,d,c,l,t[n+14],17,-1502002290),l=s(l,f,d,c,t[n+15],22,1236535329),c=h(c,l,f,d,t[n+1],5,-165796510),d=h(d,c,l,f,t[n+6],9,-1069501632),f=h(f,d,c,l,t[n+11],14,643717713),l=h(l,f,d,c,t[n+0],20,-373897302),c=h(c,l,f,d,t[n+5],5,-701558691),d=h(d,c,l,f,t[n+10],9,38016083),f=h(f,d,c,l,t[n+15],14,-660478335),l=h(l,f,d,c,t[n+4],20,-405537848),c=h(c,l,f,d,t[n+9],5,568446438),d=h(d,c,l,f,t[n+14],9,-1019803690),f=h(f,d,c,l,t[n+3],14,-187363961),l=h(l,f,d,c,t[n+8],20,1163531501),c=h(c,l,f,d,t[n+13],5,-1444681467),d=h(d,c,l,f,t[n+2],9,-51403784),f=h(f,d,c,l,t[n+7],14,1735328473),l=h(l,f,d,c,t[n+12],20,-1926607734),c=p(c,l,f,d,t[n+5],4,-378558),d=p(d,c,l,f,t[n+8],11,-2022574463),f=p(f,d,c,l,t[n+11],16,1839030562),l=p(l,f,d,c,t[n+14],23,-35309556),c=p(c,l,f,d,t[n+1],4,-1530992060),d=p(d,c,l,f,t[n+4],11,1272893353),f=p(f,d,c,l,t[n+7],16,-155497632),l=p(l,f,d,c,t[n+10],23,-1094730640),c=p(c,l,f,d,t[n+13],4,681279174),d=p(d,c,l,f,t[n+0],11,-358537222),f=p(f,d,c,l,t[n+3],16,-722521979),l=p(l,f,d,c,t[n+6],23,76029189),c=p(c,l,f,d,t[n+9],4,-640364487),d=p(d,c,l,f,t[n+12],11,-421815835),f=p(f,d,c,l,t[n+15],16,530742520),l=p(l,f,d,c,t[n+2],23,-995338651),c=g(c,l,f,d,t[n+0],6,-198630844),d=g(d,c,l,f,t[n+7],10,1126891415),f=g(f,d,c,l,t[n+14],15,-1416354905),l=g(l,f,d,c,t[n+5],21,-57434055),c=g(c,l,f,d,t[n+12],6,1700485571),d=g(d,c,l,f,t[n+3],10,-1894986606),f=g(f,d,c,l,t[n+10],15,-1051523),l=g(l,f,d,c,t[n+1],21,-2054922799),c=g(c,l,f,d,t[n+8],6,1873313359),d=g(d,c,l,f,t[n+15],10,-30611744),f=g(f,d,c,l,t[n+6],15,-1560198380),l=g(l,f,d,c,t[n+13],21,1309151649),c=g(c,l,f,d,t[n+4],6,-145523070),d=g(d,c,l,f,t[n+11],10,-1120210379),f=g(f,d,c,l,t[n+2],15,718787259),l=g(l,f,d,c,t[n+9],21,-343485551),c=a(c,r),l=a(l,i),f=a(f,o),d=a(d,u);return Array(c,l,f,d)}function i(t,e,n,r,i,o){return a(u(a(a(e,t),a(r,o)),i),n)}function s(t,e,n,r,o,s,a){return i(e&n|~e&r,t,e,o,s,a)}function h(t,e,n,r,o,s,a){return i(e&r|n&~r,t,e,o,s,a)}function p(t,e,n,r,o,s,a){return i(e^n^r,t,e,o,s,a)}function g(t,e,n,r,o,s,a){return i(n^(e|~r),t,e,o,s,a)}var m=!(!t||"boolean"!=typeof t.uppercase)&&t.uppercase,w=t&&"string"==typeof t.pad?t.pad:"=",v=!t||"boolean"!=typeof t.utf8||t.utf8;this.hex=function(t){return c(e(t),m)},this.b64=function(t){return y(e(t),w)},this.any=function(t,n){return d(e(t),n)},this.raw=function(t){return e(t)},this.hex_hmac=function(t,e){return c(n(t,e),m)},this.b64_hmac=function(t,e){return y(n(t,e),w)},this.any_hmac=function(t,e,r){return d(n(t,e),r)},this.vm_test=function(){return"900150983cd24fb0d6963f7d28e17f72"===hex("abc").toLowerCase()},this.setUpperCase=function(t){return"boolean"==typeof t&&(m=t),this},this.setPad=function(t){return w=t||w,this},this.setUTF8=function(t){return"boolean"==typeof t&&(v=t),this}},SHA1:function(t){function e(t){return t=g?o(t):t,h(r(p(t),8*t.length))}function n(t,e){var n,i,s,a,u;for(t=g?o(t):t,e=g?o(e):e,n=p(t),n.length>16&&(n=r(n,8*t.length)),i=Array(16),s=Array(16),a=0;a<16;a+=1)i[a]=909522486^n[a],s[a]=1549556828^n[a];return u=r(i.concat(p(e)),512+8*e.length),h(r(s.concat(u),672))}function r(t,e){var n,r,o,c,h,l,f,p,d=Array(80),y=1732584193,g=-271733879,m=-1732584194,w=271733878,v=-1009589776;for(t[e>>5]|=128<<24-e%32,t[15+(e+64>>9<<4)]=e,n=0;n<t.length;n+=16){for(c=y,h=g,l=m,f=w,p=v,r=0;r<80;r+=1)d[r]=r<16?t[n+r]:u(d[r-3]^d[r-8]^d[r-14]^d[r-16],1),o=a(a(u(y,5),i(r,g,m,w)),a(a(v,d[r]),s(r))),v=w,w=m,m=u(g,30),g=y,y=o;y=a(y,c),g=a(g,h),m=a(m,l),w=a(w,f),v=a(v,p)}return Array(y,g,m,w,v)}function i(t,e,n,r){return t<20?e&n|~e&r:t<40?e^n^r:t<60?e&n|e&r|n&r:e^n^r}function s(t){return t<20?1518500249:t<40?1859775393:t<60?-1894007588:-899497514}var l=!(!t||"boolean"!=typeof t.uppercase)&&t.uppercase,f=t&&"string"==typeof t.pad?t.pad:"=",g=!t||"boolean"!=typeof t.utf8||t.utf8;this.hex=function(t){return c(e(t),l)},this.b64=function(t){return y(e(t),f)},this.any=function(t,n){return d(e(t),n)},this.raw=function(t){return e(t)},this.hex_hmac=function(t,e){return c(n(t,e))},this.b64_hmac=function(t,e){return y(n(t,e),f)},this.any_hmac=function(t,e,r){return d(n(t,e),r)},this.vm_test=function(){return"900150983cd24fb0d6963f7d28e17f72"===hex("abc").toLowerCase()},this.setUpperCase=function(t){return"boolean"==typeof t&&(l=t),this},this.setPad=function(t){return f=t||f,this},this.setUTF8=function(t){return"boolean"==typeof t&&(g=t),this}},SHA256:function(t){function e(t,e){return t=e?o(t):t,h(w(p(t),8*t.length))}function n(t,e){t=E?o(t):t,e=E?o(e):e;var n,r=0,i=p(t),s=Array(16),a=Array(16);for(i.length>16&&(i=w(i,8*t.length));r<16;r+=1)s[r]=909522486^i[r],a[r]=1549556828^i[r];return n=w(s.concat(p(e)),512+8*e.length),h(w(a.concat(n),768))}function r(t,e){return t>>>e|t<<32-e}function i(t,e){return t>>>e}function s(t,e,n){return t&e^~t&n}function u(t,e,n){return t&e^t&n^e&n}function l(t){return r(t,2)^r(t,13)^r(t,22)}function f(t){return r(t,6)^r(t,11)^r(t,25)}function g(t){return r(t,7)^r(t,18)^i(t,3)}function m(t){return r(t,17)^r(t,19)^i(t,10)}function w(t,e){var n,r,i,o,c,h,p,d,y,w,b,_,E=[1779033703,-1150833019,1013904242,-1521486534,1359893119,-1694144372,528734635,1541459225],A=new Array(64);for(t[e>>5]|=128<<24-e%32,t[15+(e+64>>9<<4)]=e,y=0;y<t.length;y+=16){for(n=E[0],r=E[1],i=E[2],o=E[3],c=E[4],h=E[5],p=E[6],d=E[7],w=0;w<64;w+=1)A[w]=w<16?t[w+y]:a(a(a(m(A[w-2]),A[w-7]),g(A[w-15])),A[w-16]),b=a(a(a(a(d,f(c)),s(c,h,p)),v[w]),A[w]),_=a(l(n),u(n,r,i)),d=p,p=h,h=c,c=a(o,b),o=i,i=r,r=n,n=a(b,_);E[0]=a(n,E[0]),E[1]=a(r,E[1]),E[2]=a(i,E[2]),E[3]=a(o,E[3]),E[4]=a(c,E[4]),E[5]=a(h,E[5]),E[6]=a(p,E[6]),E[7]=a(d,E[7])}return E}var v,b=!(!t||"boolean"!=typeof t.uppercase)&&t.uppercase,_=t&&"string"==typeof t.pad?t.pad:"=",E=!t||"boolean"!=typeof t.utf8||t.utf8;this.hex=function(t){return c(e(t,E))},this.b64=function(t){return y(e(t,E),_)},this.any=function(t,n){return d(e(t,E),n)},this.raw=function(t){return e(t,E)},this.hex_hmac=function(t,e){return c(n(t,e))},this.b64_hmac=function(t,e){return y(n(t,e),_)},this.any_hmac=function(t,e,r){return d(n(t,e),r)},this.vm_test=function(){return"900150983cd24fb0d6963f7d28e17f72"===hex("abc").toLowerCase()},this.setUpperCase=function(t){return"boolean"==typeof t&&(b=t),this},this.setPad=function(t){return _=t||_,this},this.setUTF8=function(t){return"boolean"==typeof t&&(E=t),this},v=[1116352408,1899447441,-1245643825,-373957723,961987163,1508970993,-1841331548,-1424204075,-670586216,310598401,607225278,1426881987,1925078388,-2132889090,-1680079193,-1046744716,-459576895,-272742522,264347078,604807628,770255983,1249150122,1555081692,1996064986,-1740746414,-1473132947,-1341970488,-1084653625,-958395405,-710438585,113926993,338241895,666307205,773529912,1294757372,1396182291,1695183700,1986661051,-2117940946,-1838011259,-1564481375,-1474664885,-1035236496,-949202525,-778901479,-694614492,-200395387,275423344,430227734,506948616,659060556,883997877,958139571,1322822218,1537002063,1747873779,1955562222,2024104815,-2067236844,-1933114872,-1866530822,-1538233109,-1090935817,-965641998]},SHA512:function(t){function e(t){return t=_?o(t):t,h(r(p(t),8*t.length))}function n(t,e){t=_?o(t):t,e=_?o(e):e;var n,i=0,s=p(t),a=Array(32),u=Array(32);for(s.length>32&&(s=r(s,8*t.length));i<32;i+=1)a[i]=909522486^s[i],u[i]=1549556828^s[i];return n=r(a.concat(p(e)),1024+8*e.length),h(r(u.concat(n),1536))}function r(t,e){var n,r,o,c=new Array(80),h=new Array(16),p=[new i(1779033703,-205731576),new i(-1150833019,-2067093701),new i(1013904242,-23791573),new i(-1521486534,1595750129),new i(1359893119,-1377402159),new i(-1694144372,725511199),new i(528734635,-79577749),new i(1541459225,327033209)],d=new i(0,0),y=new i(0,0),v=new i(0,0),b=new i(0,0),_=new i(0,0),E=new i(0,0),A=new i(0,0),T=new i(0,0),D=new i(0,0),C=new i(0,0),x=new i(0,0),S=new i(0,0),I=new i(0,0),O=new i(0,0),B=new i(0,0),N=new i(0,0),P=new i(0,0);for(void 0===w&&(w=[new i(1116352408,-685199838),new i(1899447441,602891725),new i(-1245643825,-330482897),new i(-373957723,-2121671748),new i(961987163,-213338824),new i(1508970993,-1241133031),new i(-1841331548,-1357295717),new i(-1424204075,-630357736),new i(-670586216,-1560083902),new i(310598401,1164996542),new i(607225278,1323610764),new i(1426881987,-704662302),new i(1925078388,-226784913),new i(-2132889090,991336113),new i(-1680079193,633803317),new i(-1046744716,-815192428),new i(-459576895,-1628353838),new i(-272742522,944711139),new i(264347078,-1953704523),new i(604807628,2007800933),new i(770255983,1495990901),new i(1249150122,1856431235),new i(1555081692,-1119749164),new i(1996064986,-2096016459),new i(-1740746414,-295247957),new i(-1473132947,766784016),new i(-1341970488,-1728372417),new i(-1084653625,-1091629340),new i(-958395405,1034457026),new i(-710438585,-1828018395),new i(113926993,-536640913),new i(338241895,168717936),new i(666307205,1188179964),new i(773529912,1546045734),new i(1294757372,1522805485),new i(1396182291,-1651133473),new i(1695183700,-1951439906),new i(1986661051,1014477480),new i(-2117940946,1206759142),new i(-1838011259,344077627),new i(-1564481375,1290863460),new i(-1474664885,-1136513023),new i(-1035236496,-789014639),new i(-949202525,106217008),new i(-778901479,-688958952),new i(-694614492,1432725776),new i(-200395387,1467031594),new i(275423344,851169720),new i(430227734,-1194143544),new i(506948616,1363258195),new i(659060556,-544281703),new i(883997877,-509917016),new i(958139571,-976659869),new i(1322822218,-482243893),new i(1537002063,2003034995),new i(1747873779,-692930397),new i(1955562222,1575990012),new i(2024104815,1125592928),new i(-2067236844,-1578062990),new i(-1933114872,442776044),new i(-1866530822,593698344),new i(-1538233109,-561857047),new i(-1090935817,-1295615723),new i(-965641998,-479046869),new i(-903397682,-366583396),new i(-779700025,566280711),new i(-354779690,-840897762),new i(-176337025,-294727304),new i(116418474,1914138554),new i(174292421,-1563912026),new i(289380356,-1090974290),new i(460393269,320620315),new i(685471733,587496836),new i(852142971,1086792851),new i(1017036298,365543100),new i(1126000580,-1676669620),new i(1288033470,-885112138),new i(1501505948,-60457430),new i(1607167915,987167468),new i(1816402316,1246189591)]),r=0;r<80;r+=1)c[r]=new i(0,0);for(t[e>>5]|=128<<24-(31&e),t[31+(e+128>>10<<5)]=e,o=t.length,r=0;r<o;r+=32){for(s(v,p[0]),s(b,p[1]),s(_,p[2]),s(E,p[3]),s(A,p[4]),s(T,p[5]),s(D,p[6]),s(C,p[7]),n=0;n<16;n+=1)c[n].h=t[r+2*n],c[n].l=t[r+2*n+1];for(n=16;n<80;n+=1)a(B,c[n-2],19),u(N,c[n-2],29),l(P,c[n-2],6),S.l=B.l^N.l^P.l,S.h=B.h^N.h^P.h,a(B,c[n-15],1),a(N,c[n-15],8),l(P,c[n-15],7),x.l=B.l^N.l^P.l,x.h=B.h^N.h^P.h,g(c[n],S,c[n-7],x,c[n-16]);for(n=0;n<80;n+=1)I.l=A.l&T.l^~A.l&D.l,I.h=A.h&T.h^~A.h&D.h,a(B,A,14),a(N,A,18),u(P,A,9),S.l=B.l^N.l^P.l,S.h=B.h^N.h^P.h,a(B,v,28),u(N,v,2),u(P,v,7),x.l=B.l^N.l^P.l,x.h=B.h^N.h^P.h,O.l=v.l&b.l^v.l&_.l^b.l&_.l,O.h=v.h&b.h^v.h&_.h^b.h&_.h,m(d,C,S,I,w[n],c[n]),f(y,x,O),s(C,D),s(D,T),s(T,A),f(A,E,d),s(E,_),s(_,b),s(b,v),f(v,d,y);f(p[0],p[0],v),f(p[1],p[1],b),f(p[2],p[2],_),f(p[3],p[3],E),f(p[4],p[4],A),f(p[5],p[5],T),f(p[6],p[6],D),f(p[7],p[7],C)}for(r=0;r<8;r+=1)h[2*r]=p[r].h,h[2*r+1]=p[r].l;return h}function i(t,e){this.h=t,this.l=e}function s(t,e){t.h=e.h,t.l=e.l}function a(t,e,n){t.l=e.l>>>n|e.h<<32-n,t.h=e.h>>>n|e.l<<32-n}function u(t,e,n){t.l=e.h>>>n|e.l<<32-n,t.h=e.l>>>n|e.h<<32-n}function l(t,e,n){t.l=e.l>>>n|e.h<<32-n,t.h=e.h>>>n}function f(t,e,n){var r=(65535&e.l)+(65535&n.l),i=(e.l>>>16)+(n.l>>>16)+(r>>>16),o=(65535&e.h)+(65535&n.h)+(i>>>16),s=(e.h>>>16)+(n.h>>>16)+(o>>>16);t.l=65535&r|i<<16,t.h=65535&o|s<<16}function g(t,e,n,r,i){var o=(65535&e.l)+(65535&n.l)+(65535&r.l)+(65535&i.l),s=(e.l>>>16)+(n.l>>>16)+(r.l>>>16)+(i.l>>>16)+(o>>>16),a=(65535&e.h)+(65535&n.h)+(65535&r.h)+(65535&i.h)+(s>>>16),u=(e.h>>>16)+(n.h>>>16)+(r.h>>>16)+(i.h>>>16)+(a>>>16);t.l=65535&o|s<<16,t.h=65535&a|u<<16}function m(t,e,n,r,i,o){var s=(65535&e.l)+(65535&n.l)+(65535&r.l)+(65535&i.l)+(65535&o.l),a=(e.l>>>16)+(n.l>>>16)+(r.l>>>16)+(i.l>>>16)+(o.l>>>16)+(s>>>16),u=(65535&e.h)+(65535&n.h)+(65535&r.h)+(65535&i.h)+(65535&o.h)+(a>>>16),c=(e.h>>>16)+(n.h>>>16)+(r.h>>>16)+(i.h>>>16)+(o.h>>>16)+(u>>>16);t.l=65535&s|a<<16,t.h=65535&u|c<<16}var w,v=!(!t||"boolean"!=typeof t.uppercase)&&t.uppercase,b=t&&"string"==typeof t.pad?t.pad:"=",_=!t||"boolean"!=typeof t.utf8||t.utf8;this.hex=function(t){return c(e(t))},this.b64=function(t){return y(e(t),b)},this.any=function(t,n){return d(e(t),n)},this.raw=function(t){return e(t)},this.hex_hmac=function(t,e){return c(n(t,e))},this.b64_hmac=function(t,e){return y(n(t,e),b)},this.any_hmac=function(t,e,r){return d(n(t,e),r)},this.vm_test=function(){return"900150983cd24fb0d6963f7d28e17f72"===hex("abc").toLowerCase()},this.setUpperCase=function(t){return"boolean"==typeof t&&(v=t),this},this.setPad=function(t){return b=t||b,this},this.setUTF8=function(t){return"boolean"==typeof t&&(_=t),this}},RMD160:function(t){function e(t){return t=m?o(t):t,r(i(f(t),8*t.length))}function n(t,e){t=m?o(t):t,e=m?o(e):e;var n,s,a=f(t),u=Array(16),c=Array(16);for(a.length>16&&(a=i(a,8*t.length)),n=0;n<16;n+=1)u[n]=909522486^a[n],c[n]=1549556828^a[n];return s=i(u.concat(f(e)),512+8*e.length),r(i(c.concat(s),672))}function r(t){var e,n="",r=32*t.length;for(e=0;e<r;e+=8)n+=String.fromCharCode(t[e>>5]>>>e%32&255);return n}function i(t,e){var n,r,i,o,c,f,p,d,y,g,m,E,A,T,D=1732584193,C=4023233417,x=2562383102,S=271733878,I=3285377520;for(t[e>>5]|=128<<e%32,t[14+(e+64>>>9<<4)]=e,o=t.length,i=0;i<o;i+=16){for(c=g=D,f=m=C,p=E=x,d=A=S,y=T=I,r=0;r<=79;r+=1)n=a(c,s(r,f,p,d)),n=a(n,t[i+w[r]]),n=a(n,h(r)),n=a(u(n,b[r]),y),c=y,y=d,d=u(p,10),p=f,f=n,n=a(g,s(79-r,m,E,A)),n=a(n,t[i+v[r]]),n=a(n,l(r)),n=a(u(n,_[r]),T),g=T,T=A,A=u(E,10),E=m,m=n;n=a(C,a(p,A)),C=a(x,a(d,T)),x=a(S,a(y,g)),S=a(I,a(c,m)),I=a(D,a(f,E)),D=n}return[D,C,x,S,I]}function s(t,e,n,r){return 0<=t&&t<=15?e^n^r:16<=t&&t<=31?e&n|~e&r:32<=t&&t<=47?(e|~n)^r:48<=t&&t<=63?e&r|n&~r:64<=t&&t<=79?e^(n|~r):"rmd160_f: j out of range"}function h(t){return 0<=t&&t<=15?0:16<=t&&t<=31?1518500249:32<=t&&t<=47?1859775393:48<=t&&t<=63?2400959708:64<=t&&t<=79?2840853838:"rmd160_K1: j out of range"}function l(t){return 0<=t&&t<=15?1352829926:16<=t&&t<=31?1548603684:32<=t&&t<=47?1836072691:48<=t&&t<=63?2053994217:64<=t&&t<=79?0:"rmd160_K2: j out of range"}var p=!(!t||"boolean"!=typeof t.uppercase)&&t.uppercase,g=t&&"string"==typeof t.pad?t.pa:"=",m=!t||"boolean"!=typeof t.utf8||t.utf8,w=[0,1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,7,4,13,1,10,6,15,3,12,0,9,5,2,14,11,8,3,10,14,4,9,15,8,1,2,7,0,6,13,11,5,12,1,9,11,10,0,8,12,4,13,3,7,15,14,5,6,2,4,0,5,9,7,12,2,10,14,1,3,8,11,6,15,13],v=[5,14,7,0,9,2,11,4,13,6,15,8,1,10,3,12,6,11,3,7,0,13,5,10,14,15,8,12,4,9,1,2,15,5,1,3,7,14,6,9,11,8,12,2,10,0,4,13,8,6,4,1,3,11,15,0,5,12,2,13,9,7,10,14,12,15,10,4,1,5,8,7,6,2,13,14,0,3,9,11],b=[11,14,15,12,5,8,7,9,11,13,14,15,6,7,9,8,7,6,8,13,11,9,7,15,7,12,15,9,11,7,13,12,11,13,6,7,14,9,13,15,14,8,13,6,5,12,7,5,11,12,14,15,14,15,9,8,9,14,5,6,8,6,5,12,9,15,5,11,6,8,13,12,5,12,13,14,11,8,5,6],_=[8,9,9,11,13,15,15,5,7,7,8,11,14,14,12,6,9,13,15,7,12,8,9,11,7,7,12,7,6,15,13,11,9,7,15,11,8,6,6,14,12,13,5,14,13,13,7,5,15,5,8,11,14,14,6,14,6,9,12,9,12,5,15,8,8,5,12,9,12,5,14,6,8,13,6,5,15,13,11,11];this.hex=function(t){return c(e(t))},this.b64=function(t){return y(e(t),g)},this.any=function(t,n){return d(e(t),n)},this.raw=function(t){return e(t)},this.hex_hmac=function(t,e){return c(n(t,e))},this.b64_hmac=function(t,e){return y(n(t,e),g)},this.any_hmac=function(t,e,r){return d(n(t,e),r)},this.vm_test=function(){return"900150983cd24fb0d6963f7d28e17f72"===hex("abc").toLowerCase()},this.setUpperCase=function(t){return"boolean"==typeof t&&(p=t),this},this.setPad=function(t){return void 0!==t&&(g=t),this},this.setUTF8=function(t){return"boolean"==typeof t&&(m=t),this}}},function(o,s){e,e&&"object"==typeof r&&r&&r.global,void 0!==(i=function(){return g}.call(e,n,e,t))&&(t.exports=i)}()}()}).call(e,n(1))},function(t,e,n){var r,i;!function(o,s){r=s,void 0!==(i="function"==typeof r?r.call(e,n,e,t):r)&&(t.exports=i)}(0,function(){function t(){var t=arguments.length;if(0===t)throw new Error("resolveUrl requires at least one argument; got none.");var e=document.createElement("base");if(e.href=arguments[0],1===t)return e.href;var n=document.getElementsByTagName("head")[0];n.insertBefore(e,n.firstChild);for(var r,i=document.createElement("a"),o=1;o<t;o++)i.href=arguments[o],r=i.href,e.href=r;return n.removeChild(e),r}return t})},function(t,e,n){var r=n(47),i=n(48),o=[n(55)];t.exports=r.createStore(i,o)},function(t,e,n){function r(){var t="undefined"==typeof console?null:console;if(t){(t.warn?t.warn:t.log).apply(t,arguments)}}function i(t,e,n){n||(n=""),t&&!l(t)&&(t=[t]),e&&!l(e)&&(e=[e]);var i=n?"__storejs_"+n+"_":"",o=n?new RegExp("^"+i):null;if(!/^[a-zA-Z0-9_\-]*$/.test(n))throw new Error("store.js namespaces can only have alphanumerics + underscores and dashes");var y={_namespacePrefix:i,_namespaceRegexp:o,_testStorage:function(t){try{var e="__storejs__test__";t.write(e,e);var n=t.read(e)===e;return t.remove(e),n}catch(t){return!1}},_assignPluginFnProp:function(t,e){var n=this[e];this[e]=function(){function e(){if(n)return u(arguments,function(t,e){r[e]=t}),n.apply(i,r)}var r=s(arguments,0),i=this,o=[e].concat(r);return t.apply(i,o)}},_serialize:function(t){return JSON.stringify(t)},_deserialize:function(t,e){if(!t)return e;var n="";try{n=JSON.parse(t)}catch(e){n=t}return void 0!==n?n:e},_addStorage:function(t){this.enabled||this._testStorage(t)&&(this.storage=t,this.enabled=!0)},_addPlugin:function(t){var e=this;if(l(t))return void u(t,function(t){e._addPlugin(t)});if(!a(this.plugins,function(e){return t===e})){if(this.plugins.push(t),!f(t))throw new Error("Plugins must be function values that return objects");var n=t.call(this);if(!p(n))throw new Error("Plugins must return an object of function properties");u(n,function(n,r){if(!f(n))throw new Error("Bad plugin property: "+r+" from plugin "+t.name+". Plugins should only return functions.");e._assignPluginFnProp(n,r)})}},addStorage:function(t){r("store.addStorage(storage) is deprecated. Use createStore([storages])"),this._addStorage(t)}},g=h(y,d,{plugins:[]});return g.raw={},u(g,function(t,e){f(t)&&(g.raw[e]=c(g,t))}),u(t,function(t){g._addStorage(t)}),u(e,function(t){g._addPlugin(t)}),g}var o=n(4),s=o.slice,a=o.pluck,u=o.each,c=o.bind,h=o.create,l=o.isList,f=o.isFunction,p=o.isObject;t.exports={createStore:i};var d={version:"2.0.12",enabled:!1,get:function(t,e){var n=this.storage.read(this._namespacePrefix+t);return this._deserialize(n,e)},set:function(t,e){return void 0===e?this.remove(t):(this.storage.write(this._namespacePrefix+t,this._serialize(e)),e)},remove:function(t){this.storage.remove(this._namespacePrefix+t)},each:function(t){var e=this;this.storage.each(function(n,r){t.call(e,e._deserialize(n),(r||"").replace(e._namespaceRegexp,""))})},clearAll:function(){this.storage.clearAll()},hasNamespace:function(t){return this._namespacePrefix=="__storejs_"+t+"_"},createStore:function(){return i.apply(this,arguments)},addPlugin:function(t){this._addPlugin(t)},namespace:function(t){return i(this.storage,this.plugins,t)}}},function(t,e,n){t.exports=[n(49),n(50),n(51),n(52),n(53),n(54)]},function(t,e,n){function r(){return h.localStorage}function i(t){return r().getItem(t)}function o(t,e){return r().setItem(t,e)}function s(t){for(var e=r().length-1;e>=0;e--){var n=r().key(e);t(i(n),n)}}function a(t){return r().removeItem(t)}function u(){return r().clear()}var c=n(4),h=c.Global;t.exports={name:"localStorage",read:i,write:o,each:s,remove:a,clearAll:u}},function(t,e,n){function r(t){return h[t]}function i(t,e){h[t]=e}function o(t){for(var e=h.length-1;e>=0;e--){var n=h.key(e);t(h[n],n)}}function s(t){return h.removeItem(t)}function a(){o(function(t,e){delete h[t]})}var u=n(4),c=u.Global;t.exports={name:"oldFF-globalStorage",read:r,write:i,each:o,remove:s,clearAll:a};var h=c.globalStorage},function(t,e,n){function r(t,e){if(!d){var n=u(t);p(function(t){t.setAttribute(n,e),t.save(l)})}}function i(t){if(!d){var e=u(t),n=null;return p(function(t){n=t.getAttribute(e)}),n}}function o(t){p(function(e){for(var n=e.XMLDocument.documentElement.attributes,r=n.length-1;r>=0;r--){var i=n[r];t(e.getAttribute(i.name),i.name)}})}function s(t){var e=u(t);p(function(t){t.removeAttribute(e),t.save(l)})}function a(){p(function(t){var e=t.XMLDocument.documentElement.attributes;t.load(l);for(var n=e.length-1;n>=0;n--)t.removeAttribute(e[n].name);t.save(l)})}function u(t){return t.replace(/^\d/,"___$&").replace(y,"___")}var c=n(4),h=c.Global;t.exports={name:"oldIE-userDataStorage",write:r,read:i,each:o,remove:s,clearAll:a};var l="storejs",f=h.document,p=function(){if(!f||!f.documentElement||!f.documentElement.addBehavior)return null;var t,e,n;try{e=new ActiveXObject("htmlfile"),e.open(),e.write('<script>document.w=window<\/script><iframe src="/favicon.ico"></iframe>'),e.close(),t=e.w.frames[0].document,n=t.createElement("div")}catch(e){n=f.createElement("div"),t=f.body}return function(e){var r=[].slice.call(arguments,0);r.unshift(n),t.appendChild(n),n.addBehavior("#default#userData"),n.load(l),e.apply(this,r),t.removeChild(n)}}(),d=(h.navigator?h.navigator.userAgent:"").match(/ (MSIE 8|MSIE 9|MSIE 10)\./),y=new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]","g")},function(t,e,n){function r(t){if(!t||!u(t))return null;var e="(?:^|.*;\\s*)"+escape(t).replace(/[\-\.\+\*]/g,"\\$&")+"\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*";return unescape(f.cookie.replace(new RegExp(e),"$1"))}function i(t){for(var e=f.cookie.split(/; ?/g),n=e.length-1;n>=0;n--)if(l(e[n])){var r=e[n].split("="),i=unescape(r[0]),o=unescape(r[1]);t(o,i)}}function o(t,e){t&&(f.cookie=escape(t)+"="+escape(e)+"; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/")}function s(t){t&&u(t)&&(f.cookie=escape(t)+"=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/")}function a(){i(function(t,e){s(e)})}function u(t){return new RegExp("(?:^|;\\s*)"+escape(t).replace(/[\-\.\+\*]/g,"\\$&")+"\\s*\\=").test(f.cookie)}var c=n(4),h=c.Global,l=c.trim;t.exports={name:"cookieStorage",read:r,write:o,each:i,remove:s,clearAll:a};var f=h.document},function(t,e,n){function r(){return h.sessionStorage}function i(t){return r().getItem(t)}function o(t,e){return r().setItem(t,e)}function s(t){for(var e=r().length-1;e>=0;e--){var n=r().key(e);t(i(n),n)}}function a(t){return r().removeItem(t)}function u(){return r().clear()}var c=n(4),h=c.Global;t.exports={name:"sessionStorage",read:i,write:o,each:s,remove:a,clearAll:u}},function(t,e){function n(t){return a[t]}function r(t,e){a[t]=e}function i(t){for(var e in a)a.hasOwnProperty(e)&&t(a[e],e)}function o(t){delete a[t]}function s(t){a={}}t.exports={name:"memoryStorage",read:n,write:r,each:i,remove:o,clearAll:s};var a={}},function(t,e,n){function r(){return n(56),{}}t.exports=r},function(module,exports){"object"!=typeof JSON&&(JSON={}),function(){"use strict";function f(t){return t<10?"0"+t:t}function this_value(){return this.valueOf()}function quote(t){return rx_escapable.lastIndex=0,rx_escapable.test(t)?'"'+t.replace(rx_escapable,function(t){var e=meta[t];return"string"==typeof e?e:"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})+'"':'"'+t+'"'}function str(t,e){var n,r,i,o,s,a=gap,u=e[t];switch(u&&"object"==typeof u&&"function"==typeof u.toJSON&&(u=u.toJSON(t)),"function"==typeof rep&&(u=rep.call(e,t,u)),typeof u){case"string":return quote(u);case"number":return isFinite(u)?String(u):"null";case"boolean":case"null":return String(u);case"object":if(!u)return"null";if(gap+=indent,s=[],"[object Array]"===Object.prototype.toString.apply(u)){for(o=u.length,n=0;n<o;n+=1)s[n]=str(n,u)||"null";return i=0===s.length?"[]":gap?"[\n"+gap+s.join(",\n"+gap)+"\n"+a+"]":"["+s.join(",")+"]",gap=a,i}if(rep&&"object"==typeof rep)for(o=rep.length,n=0;n<o;n+=1)"string"==typeof rep[n]&&(r=rep[n],(i=str(r,u))&&s.push(quote(r)+(gap?": ":":")+i));else for(r in u)Object.prototype.hasOwnProperty.call(u,r)&&(i=str(r,u))&&s.push(quote(r)+(gap?": ":":")+i);return i=0===s.length?"{}":gap?"{\n"+gap+s.join(",\n"+gap)+"\n"+a+"}":"{"+s.join(",")+"}",gap=a,i}}var rx_one=/^[\],:{}\s]*$/,rx_two=/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g,rx_three=/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g,rx_four=/(?:^|:|,)(?:\s*\[)+/g,rx_escapable=/[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g,rx_dangerous=/[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;"function"!=typeof Date.prototype.toJSON&&(Date.prototype.toJSON=function(){return isFinite(this.valueOf())?this.getUTCFullYear()+"-"+f(this.getUTCMonth()+1)+"-"+f(this.getUTCDate())+"T"+f(this.getUTCHours())+":"+f(this.getUTCMinutes())+":"+f(this.getUTCSeconds())+"Z":null},Boolean.prototype.toJSON=this_value,Number.prototype.toJSON=this_value,String.prototype.toJSON=this_value);var gap,indent,meta,rep;"function"!=typeof JSON.stringify&&(meta={"\b":"\\b","\t":"\\t","\n":"\\n","\f":"\\f","\r":"\\r",'"':'\\"',"\\":"\\\\"},JSON.stringify=function(t,e,n){var r;if(gap="",indent="","number"==typeof n)for(r=0;r<n;r+=1)indent+=" ";else"string"==typeof n&&(indent=n);if(rep=e,e&&"function"!=typeof e&&("object"!=typeof e||"number"!=typeof e.length))throw new Error("JSON.stringify");return str("",{"":t})}),"function"!=typeof JSON.parse&&(JSON.parse=function(text,reviver){function walk(t,e){var n,r,i=t[e];if(i&&"object"==typeof i)for(n in i)Object.prototype.hasOwnProperty.call(i,n)&&(r=walk(i,n),void 0!==r?i[n]=r:delete i[n]);return reviver.call(t,e,i)}var j;if(text=String(text),rx_dangerous.lastIndex=0,rx_dangerous.test(text)&&(text=text.replace(rx_dangerous,function(t){return"\\u"+("0000"+t.charCodeAt(0).toString(16)).slice(-4)})),rx_one.test(text.replace(rx_two,"@").replace(rx_three,"]").replace(rx_four,"")))return j=eval("("+text+")"),"function"==typeof reviver?walk({"":j},""):j;throw new SyntaxError("JSON.parse")})}()},function(t,e){t.exports={endpoint:"https://www.openstreetmap.org",oauthConsumerKey:"",oauthSecret:"",oauthUserToken:"",oauthUserTokenSecret:""}},function(t,e,n){"use strict";function r(){return(new Date).toISOString()}Object.defineProperty(e,"__esModule",{value:!0}),e.getCurrentIsoTimestamp=r},function(t,e,n){"use strict";function r(t,e){var n=(0,l.findElementType)(e),r=(0,l.findElementId)(e);return(0,h.default)(t+"/api/0.6/"+e).then(function(t){return t.text()}).then(function(t){return(0,f.convertElementXmlToJson)(t,n,r)})}function i(t,e){return(0,h.default)(t+"/api/0.6/"+e+"/ways").then(function(t){return t.text()}).then(function(t){return(0,f.convertWaysXmlToJson)(t)})}function o(t,e,n,r){var i=(0,l.simpleObjectDeepClone)(n),o=i._id,s=i._type;delete i._id,delete i._type,i.osm[s][0].$.changeset=r;var a=(0,f.jsonToXml)(i),u=o?s+"/"+o:s+"/create";return new Promise(function(n){t.xhr({method:"PUT",prefix:!1,path:e+"/api/0.6/"+u,options:{header:{"Content-Type":"text/xml"}},content:a},function(t,e){if(t)throw new p.RequestException("Element sending request failed");return n(parseInt(e,10))})})}function s(t,e,n,r,i){var o=arguments.length>5&&void 0!==arguments[5]?arguments[5]:null,s=arguments.length>6&&void 0!==arguments[6]?arguments[6]:null,a={bbox:e.toString()+","+n.toString()+","+r.toString()+","+i.toString()};return o&&(a.limit=o),null!==s&&void 0!==s&&(a.closed=s),(0,h.default)(t+"/api/0.6/notes"+(0,l.buildQueryString)(a)).then(function(t){return 200!==t.status?t.text().then(function(t){return Promise.reject(t)}):t}).catch(function(t){throw new p.RequestException(t)}).then(function(t){return t.text()}).then(function(t){return(0,f.convertNotesXmlToJson)(t)})}function a(t,e){var n=arguments.length>2&&void 0!==arguments[2]?arguments[2]:"",r=arguments.length>3&&void 0!==arguments[3]?arguments[3]:"",i=(0,f.buildChangesetXml)(n,r);return new Promise(function(n){t.xhr({method:"PUT",prefix:!1,path:e+"/api/0.6/changeset/create",options:{header:{"Content-Type":"text/xml"}},content:i},function(t,e){if(t)throw new p.RequestException("Changeset creation request failed");return n(parseInt(e,10))})})}function u(t,e,n){return new Promise(function(r,i){t.xhr({method:"GET",prefix:!1,path:e+"/api/0.6/changeset/"+n.toString(),options:{header:{"Content-Type":"text/xml"}}},function(t,e){if(t)throw new p.RequestException("Changeset check request failed");return"false"===e.getElementsByTagName("changeset")[0].getAttribute("open")?i(t):r(n)})})}Object.defineProperty(e,"__esModule",{value:!0}),e.fetchElementRequest=r,e.fetchWaysForNodeRequest=i,e.sendElementRequest=o,e.fetchNotesRequest=s,e.createChangesetRequest=a,e.changesetCheckRequest=u;var c=n(60),h=function(t){return t&&t.__esModule?t:{default:t}}(c),l=n(30),f=n(61),p=n(85)},function(t,e){var n=function(t){function e(){this.fetch=!1}return e.prototype=t,new e}("undefined"!=typeof self?self:this);(function(t){!function(t){function e(t){if("string"!=typeof t&&(t=String(t)),/[^a-z0-9\-#$%&'*+.\^_`|~]/i.test(t))throw new TypeError("Invalid character in header field name");return t.toLowerCase()}function n(t){return"string"!=typeof t&&(t=String(t)),t}function r(t){var e={next:function(){var e=t.shift();return{done:void 0===e,value:e}}};return m.iterable&&(e[Symbol.iterator]=function(){return e}),e}function i(t){this.map={},t instanceof i?t.forEach(function(t,e){this.append(e,t)},this):Array.isArray(t)?t.forEach(function(t){this.append(t[0],t[1])},this):t&&Object.getOwnPropertyNames(t).forEach(function(e){this.append(e,t[e])},this)}function o(t){if(t.bodyUsed)return Promise.reject(new TypeError("Already read"));t.bodyUsed=!0}function s(t){return new Promise(function(e,n){t.onload=function(){e(t.result)},t.onerror=function(){n(t.error)}})}function a(t){var e=new FileReader,n=s(e);return e.readAsArrayBuffer(t),n}function u(t){var e=new FileReader,n=s(e);return e.readAsText(t),n}function c(t){for(var e=new Uint8Array(t),n=new Array(e.length),r=0;r<e.length;r++)n[r]=String.fromCharCode(e[r]);return n.join("")}function h(t){if(t.slice)return t.slice(0);var e=new Uint8Array(t.byteLength);return e.set(new Uint8Array(t)),e.buffer}function l(){return this.bodyUsed=!1,this._initBody=function(t){if(this._bodyInit=t,t)if("string"==typeof t)this._bodyText=t;else if(m.blob&&Blob.prototype.isPrototypeOf(t))this._bodyBlob=t;else if(m.formData&&FormData.prototype.isPrototypeOf(t))this._bodyFormData=t;else if(m.searchParams&&URLSearchParams.prototype.isPrototypeOf(t))this._bodyText=t.toString();else if(m.arrayBuffer&&m.blob&&v(t))this._bodyArrayBuffer=h(t.buffer),this._bodyInit=new Blob([this._bodyArrayBuffer]);else{if(!m.arrayBuffer||!ArrayBuffer.prototype.isPrototypeOf(t)&&!b(t))throw new Error("unsupported BodyInit type");this._bodyArrayBuffer=h(t)}else this._bodyText="";this.headers.get("content-type")||("string"==typeof t?this.headers.set("content-type","text/plain;charset=UTF-8"):this._bodyBlob&&this._bodyBlob.type?this.headers.set("content-type",this._bodyBlob.type):m.searchParams&&URLSearchParams.prototype.isPrototypeOf(t)&&this.headers.set("content-type","application/x-www-form-urlencoded;charset=UTF-8"))},m.blob&&(this.blob=function(){var t=o(this);if(t)return t;if(this._bodyBlob)return Promise.resolve(this._bodyBlob);if(this._bodyArrayBuffer)return Promise.resolve(new Blob([this._bodyArrayBuffer]));if(this._bodyFormData)throw new Error("could not read FormData body as blob");return Promise.resolve(new Blob([this._bodyText]))},this.arrayBuffer=function(){return this._bodyArrayBuffer?o(this)||Promise.resolve(this._bodyArrayBuffer):this.blob().then(a)}),this.text=function(){var t=o(this);if(t)return t;if(this._bodyBlob)return u(this._bodyBlob);if(this._bodyArrayBuffer)return Promise.resolve(c(this._bodyArrayBuffer));if(this._bodyFormData)throw new Error("could not read FormData body as text");return Promise.resolve(this._bodyText)},m.formData&&(this.formData=function(){return this.text().then(d)}),this.json=function(){return this.text().then(JSON.parse)},this}function f(t){var e=t.toUpperCase();return _.indexOf(e)>-1?e:t}function p(t,e){e=e||{};var n=e.body;if(t instanceof p){if(t.bodyUsed)throw new TypeError("Already read");this.url=t.url,this.credentials=t.credentials,e.headers||(this.headers=new i(t.headers)),this.method=t.method,this.mode=t.mode,n||null==t._bodyInit||(n=t._bodyInit,t.bodyUsed=!0)}else this.url=String(t);if(this.credentials=e.credentials||this.credentials||"omit",!e.headers&&this.headers||(this.headers=new i(e.headers)),this.method=f(e.method||this.method||"GET"),this.mode=e.mode||this.mode||null,this.referrer=null,("GET"===this.method||"HEAD"===this.method)&&n)throw new TypeError("Body not allowed for GET or HEAD requests");this._initBody(n)}function d(t){var e=new FormData;return t.trim().split("&").forEach(function(t){if(t){var n=t.split("="),r=n.shift().replace(/\+/g," "),i=n.join("=").replace(/\+/g," ");e.append(decodeURIComponent(r),decodeURIComponent(i))}}),e}function y(t){var e=new i;return t.split(/\r?\n/).forEach(function(t){var n=t.split(":"),r=n.shift().trim();if(r){var i=n.join(":").trim();e.append(r,i)}}),e}function g(t,e){e||(e={}),this.type="default",this.status="status"in e?e.status:200,this.ok=this.status>=200&&this.status<300,this.statusText="statusText"in e?e.statusText:"OK",this.headers=new i(e.headers),this.url=e.url||"",this._initBody(t)}if(!t.fetch){var m={searchParams:"URLSearchParams"in t,iterable:"Symbol"in t&&"iterator"in Symbol,blob:"FileReader"in t&&"Blob"in t&&function(){try{return new Blob,!0}catch(t){return!1}}(),formData:"FormData"in t,arrayBuffer:"ArrayBuffer"in t};if(m.arrayBuffer)var w=["[object Int8Array]","[object Uint8Array]","[object Uint8ClampedArray]","[object Int16Array]","[object Uint16Array]","[object Int32Array]","[object Uint32Array]","[object Float32Array]","[object Float64Array]"],v=function(t){return t&&DataView.prototype.isPrototypeOf(t)},b=ArrayBuffer.isView||function(t){return t&&w.indexOf(Object.prototype.toString.call(t))>-1};i.prototype.append=function(t,r){t=e(t),r=n(r);var i=this.map[t];this.map[t]=i?i+","+r:r},i.prototype.delete=function(t){delete this.map[e(t)]},i.prototype.get=function(t){return t=e(t),this.has(t)?this.map[t]:null},i.prototype.has=function(t){return this.map.hasOwnProperty(e(t))},i.prototype.set=function(t,r){this.map[e(t)]=n(r)},i.prototype.forEach=function(t,e){for(var n in this.map)this.map.hasOwnProperty(n)&&t.call(e,this.map[n],n,this)},i.prototype.keys=function(){var t=[];return this.forEach(function(e,n){t.push(n)}),r(t)},i.prototype.values=function(){var t=[];return this.forEach(function(e){t.push(e)}),r(t)},i.prototype.entries=function(){var t=[];return this.forEach(function(e,n){t.push([n,e])}),r(t)},m.iterable&&(i.prototype[Symbol.iterator]=i.prototype.entries);var _=["DELETE","GET","HEAD","OPTIONS","POST","PUT"];p.prototype.clone=function(){return new p(this,{body:this._bodyInit})},l.call(p.prototype),l.call(g.prototype),g.prototype.clone=function(){return new g(this._bodyInit,{status:this.status,statusText:this.statusText,headers:new i(this.headers),url:this.url})},g.error=function(){var t=new g(null,{status:0,statusText:""});return t.type="error",t};var E=[301,302,303,307,308];g.redirect=function(t,e){if(-1===E.indexOf(e))throw new RangeError("Invalid status code");return new g(null,{status:e,headers:{location:t}})},t.Headers=i,t.Request=p,t.Response=g,t.fetch=function(t,e){return new Promise(function(n,r){var i=new p(t,e),o=new XMLHttpRequest;o.onload=function(){var t={status:o.status,statusText:o.statusText,headers:y(o.getAllResponseHeaders()||"")};t.url="responseURL"in o?o.responseURL:t.headers.get("X-Request-URL");var e="response"in o?o.response:o.responseText;n(new g(e,t))},o.onerror=function(){r(new TypeError("Network request failed"))},o.ontimeout=function(){r(new TypeError("Network request failed"))},o.open(i.method,i.url,!0),"include"===i.credentials&&(o.withCredentials=!0),"responseType"in o&&m.blob&&(o.responseType="blob"),i.headers.forEach(function(t,e){o.setRequestHeader(e,t)}),o.send(void 0===i._bodyInit?null:i._bodyInit)})},t.fetch.polyfill=!0}}(void 0!==t?t:this)}).call(n,void 0);var r=n.fetch;r.Response=n.Response,r.Request=n.Request,r.Headers=n.Headers;"object"==typeof t&&t.exports&&(t.exports=r)},function(t,e,n){"use strict";function r(t){if(Array.isArray(t)){for(var e=0,n=Array(t.length);e<t.length;e++)n[e]=t[e];return n}return Array.from(t)}function i(){return(arguments.length>0&&void 0!==arguments[0]?arguments[0]:"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&apos;")}function o(){var t=arguments.length>0&&void 0!==arguments[0]?arguments[0]:"",e=arguments.length>1&&void 0!==arguments[1]?arguments[1]:"";return'\n    <osm>\n      <changeset>\n        <tag k="created_by" v="'+i(t)+'"/>\n        <tag k="created_by:library" v="OSM Request '+g+'"/>\n        <tag k="comment" v="'+i(e)+'"/>\n      </changeset>\n    </osm>\n  '}function s(t,e,n){return h(t).then(function(t){return f({},t,{_id:n,_type:e})})}function a(t){return h(t).then(function(t){return t.osm.way?t.osm.way.map(function(e){return{osm:{$:t.osm.$,way:[e]},_id:e.$.id,_type:"way"}}):[]})}function u(t){return h(t).then(function(t){return t.osm.note}).then(function(t){return t.map(function(t){var e=c(t);return e.comments=[].concat(r(e.comments.comment.map(function(t){return c(t)}))),e})})}function c(t){var e=f({},t.$);return Object.keys(t).forEach(function(n){"$"!==n&&t[n]&&0!==t[n].length&&(e[n]=t[n][0])}),e}function h(t){return new Promise(function(e,n){(0,p.parseString)(t,function(t,r){t&&n(t),e(r)})})}function l(t){return new p.Builder({xmldec:{version:"1.0",encoding:"UTF-8",standalone:null}}).buildObject(t)}Object.defineProperty(e,"__esModule",{value:!0});var f=Object.assign||function(t){for(var e=1;e<arguments.length;e++){var n=arguments[e];for(var r in n)Object.prototype.hasOwnProperty.call(n,r)&&(t[r]=n[r])}return t};e.encodeXML=i,e.buildChangesetXml=o,e.convertElementXmlToJson=s,e.convertWaysXmlToJson=a,e.convertNotesXmlToJson=u,e.flattenAttributes=c,e.xmlToJson=h,e.jsonToXml=l;var p=n(62),d=n(84),y=function(t){return t&&t.__esModule?t:{default:t}}(d),g=y.default.version},function(t,e,n){(function(){"use strict";var t,r,i,o,s=function(t,e){function n(){this.constructor=t}for(var r in e)a.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},a={}.hasOwnProperty;r=n(23),t=n(63),i=n(68),o=n(40),e.defaults=r.defaults,e.processors=o,e.ValidationError=function(t){function e(t){this.message=t}return s(e,t),e}(Error),e.Builder=t.Builder,e.Parser=i.Parser,e.parseString=i.parseString}).call(this)},function(t,e,n){(function(){"use strict";var t,r,i,o,s,a={}.hasOwnProperty;t=n(64),r=n(23).defaults,o=function(t){return"string"==typeof t&&(t.indexOf("&")>=0||t.indexOf(">")>=0||t.indexOf("<")>=0)},s=function(t){return"<![CDATA["+i(t)+"]]>"},i=function(t){return t.replace("]]>","]]]]><![CDATA[>")},e.Builder=function(){function e(t){var e,n,i;this.options={},n=r[.2];for(e in n)a.call(n,e)&&(i=n[e],this.options[e]=i);for(e in t)a.call(t,e)&&(i=t[e],this.options[e]=i)}return e.prototype.buildObject=function(e){var n,i,u,c,h;return n=this.options.attrkey,i=this.options.charkey,1===Object.keys(e).length&&this.options.rootName===r[.2].rootName?(h=Object.keys(e)[0],e=e[h]):h=this.options.rootName,u=function(t){return function(e,r){var c,h,l,f,p,d;if("object"!=typeof r)t.options.cdata&&o(r)?e.raw(s(r)):e.txt(r);else if(Array.isArray(r)){for(f in r)if(a.call(r,f)){h=r[f];for(p in h)l=h[p],e=u(e.ele(p),l).up()}}else for(p in r)if(a.call(r,p))if(h=r[p],p===n){if("object"==typeof h)for(c in h)d=h[c],e=e.att(c,d)}else if(p===i)e=t.options.cdata&&o(h)?e.raw(s(h)):e.txt(h);else if(Array.isArray(h))for(f in h)a.call(h,f)&&(l=h[f],e="string"==typeof l?t.options.cdata&&o(l)?e.ele(p).raw(s(l)).up():e.ele(p,l).up():u(e.ele(p),l).up());else"object"==typeof h?e=u(e.ele(p),h).up():"string"==typeof h&&t.options.cdata&&o(h)?e=e.ele(p).raw(s(h)).up():(null==h&&(h=""),e=e.ele(p,h.toString()).up());return e}}(this),c=t.create(h,this.options.xmldec,this.options.doctype,{headless:this.options.headless,allowSurrogateChars:this.options.allowSurrogateChars}),u(c,e).end(this.options.renderOpts)},e}()}).call(this)},function(t,e,n){(function(){var e,r,i,o,s,a,u;u=n(2),s=u.assign,a=u.isFunction,e=n(65),r=n(66),o=n(24),i=n(67),t.exports.create=function(t,n,r,i){var o,a;if(null==t)throw new Error("Root element needs a name");return i=s({},n,r,i),o=new e(i),a=o.element(t),i.headless||(o.declaration(i),null==i.pubID&&null==i.sysID||o.doctype(i)),a},t.exports.begin=function(t,n,i){var o;return a(t)&&(o=[t,n],n=o[0],i=o[1],t={}),n?new r(t,n,i):new e(t)},t.exports.stringWriter=function(t){return new o(t)},t.exports.streamWriter=function(t,e){return new i(t,e)}}).call(this)},function(t,e,n){(function(){var e,r,i,o,s=function(t,e){function n(){this.constructor=t}for(var r in e)a.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},a={}.hasOwnProperty;o=n(2).isPlainObject,e=n(0),i=n(32),r=n(24),t.exports=function(t){function e(t){e.__super__.constructor.call(this,null),t||(t={}),t.writer||(t.writer=new r),this.options=t,this.stringify=new i(t),this.isDocument=!0}return s(e,t),e.prototype.end=function(t){var e;return t?o(t)&&(e=t,t=this.options.writer.set(e)):t=this.options.writer,t.document(this)},e.prototype.toString=function(t){return this.options.writer.set(t).document(this)},e}(e)}).call(this)},function(t,e,n){(function(){var e,r,i,o,s,a,u,c,h,l,f,p,d,y,g,m,w,v,b,_={}.hasOwnProperty;b=n(2),w=b.isObject,m=b.isFunction,v=b.isPlainObject,l=n(7),r=n(8),i=n(9),p=n(16),g=n(17),f=n(18),c=n(10),h=n(11),o=n(12),a=n(13),s=n(14),u=n(15),e=n(31),y=n(32),d=n(24),t.exports=function(){function t(t,e,n){var r;t||(t={}),t.writer?v(t.writer)&&(r=t.writer,t.writer=new d(r)):t.writer=new d(t),this.options=t,this.writer=t.writer,this.stringify=new y(t),this.onDataCallback=e||function(){},this.onEndCallback=n||function(){},this.currentNode=null,this.currentLevel=-1,this.openTags={},this.documentStarted=!1,this.documentCompleted=!1,this.root=null}return t.prototype.node=function(t,e,n){var r;if(null==t)throw new Error("Missing node name");if(this.root&&-1===this.currentLevel)throw new Error("Document can only have one root node");return this.openCurrent(),t=t.valueOf(),null==e&&(e={}),e=e.valueOf(),w(e)||(r=[e,n],n=r[0],e=r[1]),this.currentNode=new l(this,t,e),this.currentNode.children=!1,this.currentLevel++,this.openTags[this.currentLevel]=this.currentNode,null!=n&&this.text(n),this},t.prototype.element=function(t,e,n){return this.currentNode&&this.currentNode instanceof h?this.dtdElement.apply(this,arguments):this.node(t,e,n)},t.prototype.attribute=function(t,n){var r,i;if(!this.currentNode||this.currentNode.children)throw new Error("att() can only be used immediately after an ele() call in callback mode");if(null!=t&&(t=t.valueOf()),w(t))for(r in t)_.call(t,r)&&(i=t[r],this.attribute(r,i));else m(n)&&(n=n.apply()),this.options.skipNullAttributes&&null==n||(this.currentNode.attributes[t]=new e(this,t,n));return this},t.prototype.text=function(t){var e;return this.openCurrent(),e=new g(this,t),this.onData(this.writer.text(e,this.currentLevel+1)),this},t.prototype.cdata=function(t){var e;return this.openCurrent(),e=new r(this,t),this.onData(this.writer.cdata(e,this.currentLevel+1)),this},t.prototype.comment=function(t){var e;return this.openCurrent(),e=new i(this,t),this.onData(this.writer.comment(e,this.currentLevel+1)),this},t.prototype.raw=function(t){var e;return this.openCurrent(),e=new p(this,t),this.onData(this.writer.raw(e,this.currentLevel+1)),this},t.prototype.instruction=function(t,e){var n,r,i,o,s;if(this.openCurrent(),null!=t&&(t=t.valueOf()),null!=e&&(e=e.valueOf()),Array.isArray(t))for(n=0,o=t.length;n<o;n++)r=t[n],this.instruction(r);else if(w(t))for(r in t)_.call(t,r)&&(i=t[r],this.instruction(r,i));else m(e)&&(e=e.apply()),s=new f(this,t,e),this.onData(this.writer.processingInstruction(s,this.currentLevel+1));return this},t.prototype.declaration=function(t,e,n){var r;if(this.openCurrent(),this.documentStarted)throw new Error("declaration() must be the first node");return r=new c(this,t,e,n),this.onData(this.writer.declaration(r,this.currentLevel+1)),this},t.prototype.doctype=function(t,e,n){if(this.openCurrent(),null==t)throw new Error("Missing root node name");if(this.root)throw new Error("dtd() must come before the root node");return this.currentNode=new h(this,e,n),this.currentNode.rootNodeName=t,this.currentNode.children=!1,this.currentLevel++,this.openTags[this.currentLevel]=this.currentNode,this},t.prototype.dtdElement=function(t,e){var n;return this.openCurrent(),n=new s(this,t,e),this.onData(this.writer.dtdElement(n,this.currentLevel+1)),this},t.prototype.attList=function(t,e,n,r,i){var s;return this.openCurrent(),s=new o(this,t,e,n,r,i),this.onData(this.writer.dtdAttList(s,this.currentLevel+1)),this},t.prototype.entity=function(t,e){var n;return this.openCurrent(),n=new a(this,!1,t,e),this.onData(this.writer.dtdEntity(n,this.currentLevel+1)),this},t.prototype.pEntity=function(t,e){var n;return this.openCurrent(),n=new a(this,!0,t,e),this.onData(this.writer.dtdEntity(n,this.currentLevel+1)),this},t.prototype.notation=function(t,e){var n;return this.openCurrent(),n=new u(this,t,e),this.onData(this.writer.dtdNotation(n,this.currentLevel+1)),this},t.prototype.up=function(){if(this.currentLevel<0)throw new Error("The document node has no parent");return this.currentNode?(this.currentNode.children?this.closeNode(this.currentNode):this.openNode(this.currentNode),this.currentNode=null):this.closeNode(this.openTags[this.currentLevel]),delete this.openTags[this.currentLevel],this.currentLevel--,this},t.prototype.end=function(){for(;this.currentLevel>=0;)this.up();return this.onEnd()},t.prototype.openCurrent=function(){if(this.currentNode)return this.currentNode.children=!0,this.openNode(this.currentNode)},t.prototype.openNode=function(t){if(!t.isOpen)return!this.root&&0===this.currentLevel&&t instanceof l&&(this.root=t),this.onData(this.writer.openNode(t,this.currentLevel)),t.isOpen=!0},t.prototype.closeNode=function(t){if(!t.isClosed)return this.onData(this.writer.closeNode(t,this.currentLevel)),t.isClosed=!0},t.prototype.onData=function(t){return this.documentStarted=!0,this.onDataCallback(t)},t.prototype.onEnd=function(){return this.documentCompleted=!0,this.onEndCallback()},t.prototype.ele=function(){return this.element.apply(this,arguments)},t.prototype.nod=function(t,e,n){return this.node(t,e,n)},t.prototype.txt=function(t){return this.text(t)},t.prototype.dat=function(t){return this.cdata(t)},t.prototype.com=function(t){return this.comment(t)},t.prototype.ins=function(t,e){return this.instruction(t,e)},t.prototype.dec=function(t,e,n){return this.declaration(t,e,n)},t.prototype.dtd=function(t,e,n){return this.doctype(t,e,n)},t.prototype.e=function(t,e,n){return this.element(t,e,n)},t.prototype.n=function(t,e,n){return this.node(t,e,n)},t.prototype.t=function(t){return this.text(t)},t.prototype.d=function(t){return this.cdata(t)},t.prototype.c=function(t){return this.comment(t)},t.prototype.r=function(t){return this.raw(t)},t.prototype.i=function(t,e){return this.instruction(t,e)},t.prototype.att=function(){return this.currentNode&&this.currentNode instanceof h?this.attList.apply(this,arguments):this.attribute.apply(this,arguments)},t.prototype.a=function(){return this.currentNode&&this.currentNode instanceof h?this.attList.apply(this,arguments):this.attribute.apply(this,arguments)},t.prototype.ent=function(t,e){return this.entity(t,e)},t.prototype.pent=function(t,e){return this.pEntity(t,e)},t.prototype.not=function(t,e){return this.notation(t,e)},t}()}).call(this)},function(t,e,n){(function(){var e,r,i,o,s,a,u,c,h,l,f,p,d,y=function(t,e){function n(){this.constructor=t}for(var r in e)g.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},g={}.hasOwnProperty;u=n(10),c=n(11),e=n(8),r=n(9),h=n(7),f=n(16),p=n(17),l=n(18),i=n(12),o=n(14),s=n(13),a=n(15),d=n(33),t.exports=function(t){function n(t,e){n.__super__.constructor.call(this,e),this.stream=t}return y(n,t),n.prototype.document=function(t){var e,n,i,o,s,a,h,f;for(a=t.children,n=0,o=a.length;n<o;n++)e=a[n],e.isLastRootNode=!1;for(t.children[t.children.length-1].isLastRootNode=!0,h=t.children,f=[],i=0,s=h.length;i<s;i++)switch(e=h[i],!1){case!(e instanceof u):f.push(this.declaration(e));break;case!(e instanceof c):f.push(this.docType(e));break;case!(e instanceof r):f.push(this.comment(e));break;case!(e instanceof l):f.push(this.processingInstruction(e));break;default:f.push(this.element(e))}return f},n.prototype.attribute=function(t){return this.stream.write(" "+t.name+'="'+t.value+'"')},n.prototype.cdata=function(t,e){return this.stream.write(this.space(e)+"<![CDATA["+t.text+"]]>"+this.endline(t))},n.prototype.comment=function(t,e){return this.stream.write(this.space(e)+"\x3c!-- "+t.text+" --\x3e"+this.endline(t))},n.prototype.declaration=function(t,e){return this.stream.write(this.space(e)),this.stream.write('<?xml version="'+t.version+'"'),null!=t.encoding&&this.stream.write(' encoding="'+t.encoding+'"'),null!=t.standalone&&this.stream.write(' standalone="'+t.standalone+'"'),this.stream.write(this.spacebeforeslash+"?>"),this.stream.write(this.endline(t))},n.prototype.docType=function(t,n){var u,c,h,f;if(n||(n=0),this.stream.write(this.space(n)),this.stream.write("<!DOCTYPE "+t.root().name),t.pubID&&t.sysID?this.stream.write(' PUBLIC "'+t.pubID+'" "'+t.sysID+'"'):t.sysID&&this.stream.write(' SYSTEM "'+t.sysID+'"'),t.children.length>0){for(this.stream.write(" ["),this.stream.write(this.endline(t)),f=t.children,c=0,h=f.length;c<h;c++)switch(u=f[c],!1){case!(u instanceof i):this.dtdAttList(u,n+1);break;case!(u instanceof o):this.dtdElement(u,n+1);break;case!(u instanceof s):this.dtdEntity(u,n+1);break;case!(u instanceof a):this.dtdNotation(u,n+1);break;case!(u instanceof e):this.cdata(u,n+1);break;case!(u instanceof r):this.comment(u,n+1);break;case!(u instanceof l):this.processingInstruction(u,n+1);break;default:throw new Error("Unknown DTD node type: "+u.constructor.name)}this.stream.write("]")}return this.stream.write(this.spacebeforeslash+">"),this.stream.write(this.endline(t))},n.prototype.element=function(t,n){var i,o,s,a,u,c,d,y;n||(n=0),y=this.space(n),this.stream.write(y+"<"+t.name),c=t.attributes;for(u in c)g.call(c,u)&&(i=c[u],this.attribute(i));if(0===t.children.length||t.children.every(function(t){return""===t.value}))this.allowEmpty?this.stream.write("></"+t.name+">"):this.stream.write(this.spacebeforeslash+"/>");else if(this.pretty&&1===t.children.length&&null!=t.children[0].value)this.stream.write(">"),this.stream.write(t.children[0].value),this.stream.write("</"+t.name+">");else{for(this.stream.write(">"+this.newline),d=t.children,s=0,a=d.length;s<a;s++)switch(o=d[s],!1){case!(o instanceof e):this.cdata(o,n+1);break;case!(o instanceof r):this.comment(o,n+1);break;case!(o instanceof h):this.element(o,n+1);break;case!(o instanceof f):this.raw(o,n+1);break;case!(o instanceof p):this.text(o,n+1);break;case!(o instanceof l):this.processingInstruction(o,n+1);break;default:throw new Error("Unknown XML node type: "+o.constructor.name)}this.stream.write(y+"</"+t.name+">")}return this.stream.write(this.endline(t))},n.prototype.processingInstruction=function(t,e){return this.stream.write(this.space(e)+"<?"+t.target),t.value&&this.stream.write(" "+t.value),this.stream.write(this.spacebeforeslash+"?>"+this.endline(t))},n.prototype.raw=function(t,e){return this.stream.write(this.space(e)+t.value+this.endline(t))},n.prototype.text=function(t,e){return this.stream.write(this.space(e)+t.value+this.endline(t))},n.prototype.dtdAttList=function(t,e){return this.stream.write(this.space(e)+"<!ATTLIST "+t.elementName+" "+t.attributeName+" "+t.attributeType),"#DEFAULT"!==t.defaultValueType&&this.stream.write(" "+t.defaultValueType),t.defaultValue&&this.stream.write(' "'+t.defaultValue+'"'),this.stream.write(this.spacebeforeslash+">"+this.endline(t))},n.prototype.dtdElement=function(t,e){return this.stream.write(this.space(e)+"<!ELEMENT "+t.name+" "+t.value),this.stream.write(this.spacebeforeslash+">"+this.endline(t))},n.prototype.dtdEntity=function(t,e){return this.stream.write(this.space(e)+"<!ENTITY"),t.pe&&this.stream.write(" %"),this.stream.write(" "+t.name),t.value?this.stream.write(' "'+t.value+'"'):(t.pubID&&t.sysID?this.stream.write(' PUBLIC "'+t.pubID+'" "'+t.sysID+'"'):t.sysID&&this.stream.write(' SYSTEM "'+t.sysID+'"'),t.nData&&this.stream.write(" NDATA "+t.nData)),this.stream.write(this.spacebeforeslash+">"+this.endline(t))},n.prototype.dtdNotation=function(t,e){return this.stream.write(this.space(e)+"<!NOTATION "+t.name),t.pubID&&t.sysID?this.stream.write(' PUBLIC "'+t.pubID+'" "'+t.sysID+'"'):t.pubID?this.stream.write(' PUBLIC "'+t.pubID+'"'):t.sysID&&this.stream.write(' SYSTEM "'+t.sysID+'"'),this.stream.write(this.spacebeforeslash+">"+this.endline(t))},n.prototype.endline=function(t){return t.isLastRootNode?"":this.newline},n}(d)}).call(this)},function(t,e,n){(function(){"use strict";var t,r,i,o,s,a,u,c,h=function(t,e){return function(){return t.apply(e,arguments)}},l=function(t,e){function n(){this.constructor=t}for(var r in e)f.call(e,r)&&(t[r]=e[r]);return n.prototype=e.prototype,t.prototype=new n,t.__super__=e.prototype,t},f={}.hasOwnProperty;u=n(69),i=n(19),t=n(83),a=n(40),c=n(38).setImmediate,r=n(23).defaults,o=function(t){return"object"==typeof t&&null!=t&&0===Object.keys(t).length},s=function(t,e,n){var r,i,o;for(r=0,i=t.length;r<i;r++)o=t[r],e=o(e,n);return e},e.Parser=function(n){function i(t){this.parseString=h(this.parseString,this),this.reset=h(this.reset,this),this.assignOrPush=h(this.assignOrPush,this),this.processAsync=h(this.processAsync,this);var n,i,o;if(!(this instanceof e.Parser))return new e.Parser(t);this.options={},i=r[.2];for(n in i)f.call(i,n)&&(o=i[n],this.options[n]=o);for(n in t)f.call(t,n)&&(o=t[n],this.options[n]=o);this.options.xmlns&&(this.options.xmlnskey=this.options.attrkey+"ns"),this.options.normalizeTags&&(this.options.tagNameProcessors||(this.options.tagNameProcessors=[]),this.options.tagNameProcessors.unshift(a.normalize)),this.reset()}return l(i,n),i.prototype.processAsync=function(){var t,e;try{return this.remaining.length<=this.options.chunkSize?(t=this.remaining,this.remaining="",this.saxParser=this.saxParser.write(t),this.saxParser.close()):(t=this.remaining.substr(0,this.options.chunkSize),this.remaining=this.remaining.substr(this.options.chunkSize,this.remaining.length),this.saxParser=this.saxParser.write(t),c(this.processAsync))}catch(t){if(e=t,!this.saxParser.errThrown)return this.saxParser.errThrown=!0,this.emit(e)}},i.prototype.assignOrPush=function(t,e,n){return e in t?(t[e]instanceof Array||(t[e]=[t[e]]),t[e].push(n)):this.options.explicitArray?t[e]=[n]:t[e]=n},i.prototype.reset=function(){var t,e,n,r;return this.removeAllListeners(),this.saxParser=u.parser(this.options.strict,{trim:!1,normalize:!1,xmlns:this.options.xmlns}),this.saxParser.errThrown=!1,this.saxParser.onerror=function(t){return function(e){if(t.saxParser.resume(),!t.saxParser.errThrown)return t.saxParser.errThrown=!0,t.emit("error",e)}}(this),this.saxParser.onend=function(t){return function(){if(!t.saxParser.ended)return t.saxParser.ended=!0,t.emit("end",t.resultObject)}}(this),this.saxParser.ended=!1,this.EXPLICIT_CHARKEY=this.options.explicitCharkey,this.resultObject=null,r=[],t=this.options.attrkey,e=this.options.charkey,this.saxParser.onopentag=function(n){return function(i){var o,a,u,c,h;if(u={},u[e]="",!n.options.ignoreAttrs){h=i.attributes;for(o in h)f.call(h,o)&&(t in u||n.options.mergeAttrs||(u[t]={}),a=n.options.attrValueProcessors?s(n.options.attrValueProcessors,i.attributes[o],o):i.attributes[o],c=n.options.attrNameProcessors?s(n.options.attrNameProcessors,o):o,n.options.mergeAttrs?n.assignOrPush(u,c,a):u[t][c]=a)}return u["#name"]=n.options.tagNameProcessors?s(n.options.tagNameProcessors,i.name):i.name,n.options.xmlns&&(u[n.options.xmlnskey]={uri:i.uri,local:i.local}),r.push(u)}}(this),this.saxParser.onclosetag=function(t){return function(){var n,i,a,u,c,h,l,p,d,y;if(h=r.pop(),c=h["#name"],t.options.explicitChildren&&t.options.preserveChildrenOrder||delete h["#name"],!0===h.cdata&&(n=h.cdata,delete h.cdata),d=r[r.length-1],h[e].match(/^\s*$/)&&!n?(i=h[e],delete h[e]):(t.options.trim&&(h[e]=h[e].trim()),t.options.normalize&&(h[e]=h[e].replace(/\s{2,}/g," ").trim()),h[e]=t.options.valueProcessors?s(t.options.valueProcessors,h[e],c):h[e],1===Object.keys(h).length&&e in h&&!t.EXPLICIT_CHARKEY&&(h=h[e])),o(h)&&(h=""!==t.options.emptyTag?t.options.emptyTag:i),null!=t.options.validator&&(y="/"+function(){var t,e,n;for(n=[],t=0,e=r.length;t<e;t++)u=r[t],n.push(u["#name"]);return n}().concat(c).join("/"),function(){var e;try{h=t.options.validator(y,d&&d[c],h)}catch(n){return e=n,t.emit("error",e)}}()),t.options.explicitChildren&&!t.options.mergeAttrs&&"object"==typeof h)if(t.options.preserveChildrenOrder){if(d){d[t.options.childkey]=d[t.options.childkey]||[],l={};for(a in h)f.call(h,a)&&(l[a]=h[a]);d[t.options.childkey].push(l),delete h["#name"],1===Object.keys(h).length&&e in h&&!t.EXPLICIT_CHARKEY&&(h=h[e])}}else u={},t.options.attrkey in h&&(u[t.options.attrkey]=h[t.options.attrkey],delete h[t.options.attrkey]),!t.options.charsAsChildren&&t.options.charkey in h&&(u[t.options.charkey]=h[t.options.charkey],delete h[t.options.charkey]),Object.getOwnPropertyNames(h).length>0&&(u[t.options.childkey]=h),h=u;return r.length>0?t.assignOrPush(d,c,h):(t.options.explicitRoot&&(p=h,h={},h[c]=p),t.resultObject=h,t.saxParser.ended=!0,t.emit("end",t.resultObject))}}(this),n=function(t){return function(n){var i,o;if(o=r[r.length-1])return o[e]+=n,t.options.explicitChildren&&t.options.preserveChildrenOrder&&t.options.charsAsChildren&&(t.options.includeWhiteChars||""!==n.replace(/\\n/g,"").trim())&&(o[t.options.childkey]=o[t.options.childkey]||[],i={"#name":"__text__"},i[e]=n,t.options.normalize&&(i[e]=i[e].replace(/\s{2,}/g," ").trim()),o[t.options.childkey].push(i)),o}}(this),this.saxParser.ontext=n,this.saxParser.oncdata=function(t){return function(t){var e;if(e=n(t))return e.cdata=!0}}()},i.prototype.parseString=function(e,n){var r;null!=n&&"function"==typeof n&&(this.on("end",function(t){return this.reset(),n(null,t)}),this.on("error",function(t){return this.reset(),n(t)}));try{return e=e.toString(),""===e.trim()?(this.emit("end",null),!0):(e=t.stripBOM(e),this.options.async?(this.remaining=e,c(this.processAsync),this.saxParser):this.saxParser.write(e).close())}catch(t){if(r=t,!this.saxParser.errThrown&&!this.saxParser.ended)return this.emit("error",r),this.saxParser.errThrown=!0;if(this.saxParser.ended)throw r}},i}(i.EventEmitter),e.parseString=function(t,n,r){var i,o,s;return null!=r?("function"==typeof r&&(i=r),"object"==typeof n&&(o=n)):("function"==typeof n&&(i=n),o={}),s=new e.Parser(o),s.parseString(t,i)}}).call(this)},function(t,e,n){(function(t){!function(e){function r(t,n){if(!(this instanceof r))return new r(t,n);var i=this;o(i),i.q=i.c="",i.bufferCheckPosition=e.MAX_BUFFER_LENGTH,i.opt=n||{},i.opt.lowercase=i.opt.lowercase||i.opt.lowercasetags,i.looseCase=i.opt.lowercase?"toLowerCase":"toUpperCase",i.tags=[],i.closed=i.closedRoot=i.sawRoot=!1,i.tag=i.error=null,i.strict=!!t,i.noscript=!(!t&&!i.opt.noscript),i.state=Y.BEGIN,i.strictEntities=i.opt.strictEntities,i.ENTITIES=i.strictEntities?Object.create(e.XML_ENTITIES):Object.create(e.ENTITIES),i.attribList=[],i.opt.xmlns&&(i.ns=Object.create(L)),i.trackPosition=!1!==i.opt.position,i.trackPosition&&(i.position=i.line=i.column=0),d(i,"onready")}function i(t){for(var n=Math.max(e.MAX_BUFFER_LENGTH,10),r=0,i=0,o=O.length;i<o;i++){var s=t[O[i]].length;if(s>n)switch(O[i]){case"textNode":g(t);break;case"cdata":y(t,"oncdata",t.cdata),t.cdata="";break;case"script":y(t,"onscript",t.script),t.script="";break;default:w(t,"Max buffer length exceeded: "+O[i])}r=Math.max(r,s)}var a=e.MAX_BUFFER_LENGTH-r;t.bufferCheckPosition=a+t.position}function o(t){for(var e=0,n=O.length;e<n;e++)t[O[e]]=""}function s(t){g(t),""!==t.cdata&&(y(t,"oncdata",t.cdata),t.cdata=""),""!==t.script&&(y(t,"onscript",t.script),t.script="")}function a(t,e){return new u(t,e)}function u(t,e){if(!(this instanceof u))return new u(t,e);B.apply(this),this._parser=new r(t,e),this.writable=!0,this.readable=!0;var n=this;this._parser.onend=function(){n.emit("end")},this._parser.onerror=function(t){n.emit("error",t),n._parser.error=null},this._decoder=null,N.forEach(function(t){Object.defineProperty(n,"on"+t,{get:function(){return n._parser["on"+t]},set:function(e){if(!e)return n.removeAllListeners(t),n._parser["on"+t]=e,e;n.on(t,e)},enumerable:!0,configurable:!1})})}function c(t){return" "===t||"\n"===t||"\r"===t||"\t"===t}function h(t){return'"'===t||"'"===t}function l(t){return">"===t||c(t)}function f(t,e){return t.test(e)}function p(t,e){return!f(t,e)}function d(t,e,n){t[e]&&t[e](n)}function y(t,e,n){t.textNode&&g(t),d(t,e,n)}function g(t){t.textNode=m(t.opt,t.textNode),t.textNode&&d(t,"ontext",t.textNode),t.textNode=""}function m(t,e){return t.trim&&(e=e.trim()),t.normalize&&(e=e.replace(/\s+/g," ")),e}function w(t,e){return g(t),t.trackPosition&&(e+="\nLine: "+t.line+"\nColumn: "+t.column+"\nChar: "+t.c),e=new Error(e),t.error=e,d(t,"onerror",e),t}function v(t){return t.sawRoot&&!t.closedRoot&&b(t,"Unclosed root tag"),t.state!==Y.BEGIN&&t.state!==Y.BEGIN_WHITESPACE&&t.state!==Y.TEXT&&w(t,"Unexpected end"),g(t),t.c="",t.closed=!0,d(t,"onend"),r.call(t,t.strict,t.opt),t}function b(t,e){if("object"!=typeof t||!(t instanceof r))throw new Error("bad call to strictFail");t.strict&&w(t,e)}function _(t){t.strict||(t.tagName=t.tagName[t.looseCase]());var e=t.tags[t.tags.length-1]||t,n=t.tag={name:t.tagName,attributes:{}};t.opt.xmlns&&(n.ns=e.ns),t.attribList.length=0,y(t,"onopentagstart",n)}function E(t,e){var n=t.indexOf(":"),r=n<0?["",t]:t.split(":"),i=r[0],o=r[1];return e&&"xmlns"===t&&(i="xmlns",o=""),{prefix:i,local:o}}function A(t){if(t.strict||(t.attribName=t.attribName[t.looseCase]()),-1!==t.attribList.indexOf(t.attribName)||t.tag.attributes.hasOwnProperty(t.attribName))return void(t.attribName=t.attribValue="");if(t.opt.xmlns){var e=E(t.attribName,!0),n=e.prefix,r=e.local;if("xmlns"===n)if("xml"===r&&t.attribValue!==R)b(t,"xml: prefix must be bound to "+R+"\nActual: "+t.attribValue);else if("xmlns"===r&&t.attribValue!==k)b(t,"xmlns: prefix must be bound to "+k+"\nActual: "+t.attribValue);else{var i=t.tag,o=t.tags[t.tags.length-1]||t;i.ns===o.ns&&(i.ns=Object.create(o.ns)),i.ns[r]=t.attribValue}t.attribList.push([t.attribName,t.attribValue])}else t.tag.attributes[t.attribName]=t.attribValue,y(t,"onattribute",{name:t.attribName,value:t.attribValue});t.attribName=t.attribValue=""}function T(t,e){if(t.opt.xmlns){var n=t.tag,r=E(t.tagName);n.prefix=r.prefix,n.local=r.local,n.uri=n.ns[r.prefix]||"",n.prefix&&!n.uri&&(b(t,"Unbound namespace prefix: "+JSON.stringify(t.tagName)),n.uri=r.prefix);var i=t.tags[t.tags.length-1]||t;n.ns&&i.ns!==n.ns&&Object.keys(n.ns).forEach(function(e){y(t,"onopennamespace",{prefix:e,uri:n.ns[e]})});for(var o=0,s=t.attribList.length;o<s;o++){var a=t.attribList[o],u=a[0],c=a[1],h=E(u,!0),l=h.prefix,f=h.local,p=""===l?"":n.ns[l]||"",d={name:u,value:c,prefix:l,local:f,uri:p};l&&"xmlns"!==l&&!p&&(b(t,"Unbound namespace prefix: "+JSON.stringify(l)),d.uri=l),t.tag.attributes[u]=d,y(t,"onattribute",d)}t.attribList.length=0}t.tag.isSelfClosing=!!e,t.sawRoot=!0,t.tags.push(t.tag),y(t,"onopentag",t.tag),e||(t.noscript||"script"!==t.tagName.toLowerCase()?t.state=Y.TEXT:t.state=Y.SCRIPT,t.tag=null,t.tagName=""),t.attribName=t.attribValue="",t.attribList.length=0}function D(t){if(!t.tagName)return b(t,"Weird empty close tag."),t.textNode+="</>",void(t.state=Y.TEXT);if(t.script){if("script"!==t.tagName)return t.script+="</"+t.tagName+">",t.tagName="",void(t.state=Y.SCRIPT);y(t,"onscript",t.script),t.script=""}var e=t.tags.length,n=t.tagName;t.strict||(n=n[t.looseCase]());for(var r=n;e--;){if(t.tags[e].name===r)break;b(t,"Unexpected close tag")}if(e<0)return b(t,"Unmatched closing tag: "+t.tagName),t.textNode+="</"+t.tagName+">",void(t.state=Y.TEXT);t.tagName=n;for(var i=t.tags.length;i-- >e;){var o=t.tag=t.tags.pop();t.tagName=t.tag.name,y(t,"onclosetag",t.tagName);var s={};for(var a in o.ns)s[a]=o.ns[a];var u=t.tags[t.tags.length-1]||t;t.opt.xmlns&&o.ns!==u.ns&&Object.keys(o.ns).forEach(function(e){var n=o.ns[e];y(t,"onclosenamespace",{prefix:e,uri:n})})}0===e&&(t.closedRoot=!0),t.tagName=t.attribValue=t.attribName="",t.attribList.length=0,t.state=Y.TEXT}function C(t){var e,n=t.entity,r=n.toLowerCase(),i="";return t.ENTITIES[n]?t.ENTITIES[n]:t.ENTITIES[r]?t.ENTITIES[r]:(n=r,"#"===n.charAt(0)&&("x"===n.charAt(1)?(n=n.slice(2),e=parseInt(n,16),i=e.toString(16)):(n=n.slice(1),e=parseInt(n,10),i=e.toString(10))),n=n.replace(/^0+/,""),isNaN(e)||i.toLowerCase()!==n?(b(t,"Invalid character entity"),"&"+t.entity+";"):String.fromCodePoint(e))}function x(t,e){"<"===e?(t.state=Y.OPEN_WAKA,t.startTagPosition=t.position):c(e)||(b(t,"Non-whitespace before first tag."),t.textNode=e,t.state=Y.TEXT)}function S(t,e){var n="";return e<t.length&&(n=t.charAt(e)),n}function I(t){var e=this;if(this.error)throw this.error;if(e.closed)return w(e,"Cannot write after close. Assign an onready handler.");if(null===t)return v(e);"object"==typeof t&&(t=t.toString());for(var n=0,r="";;){if(r=S(t,n++),e.c=r,!r)break;switch(e.trackPosition&&(e.position++,"\n"===r?(e.line++,e.column=0):e.column++),e.state){case Y.BEGIN:if(e.state=Y.BEGIN_WHITESPACE,"\ufeff"===r)continue;x(e,r);continue;case Y.BEGIN_WHITESPACE:x(e,r);continue;case Y.TEXT:if(e.sawRoot&&!e.closedRoot){for(var o=n-1;r&&"<"!==r&&"&"!==r;)(r=S(t,n++))&&e.trackPosition&&(e.position++,"\n"===r?(e.line++,e.column=0):e.column++);e.textNode+=t.substring(o,n-1)}"<"!==r||e.sawRoot&&e.closedRoot&&!e.strict?(c(r)||e.sawRoot&&!e.closedRoot||b(e,"Text data outside of root node."),"&"===r?e.state=Y.TEXT_ENTITY:e.textNode+=r):(e.state=Y.OPEN_WAKA,e.startTagPosition=e.position);continue;case Y.SCRIPT:"<"===r?e.state=Y.SCRIPT_ENDING:e.script+=r;continue;case Y.SCRIPT_ENDING:"/"===r?e.state=Y.CLOSE_TAG:(e.script+="<"+r,e.state=Y.SCRIPT);continue;case Y.OPEN_WAKA:if("!"===r)e.state=Y.SGML_DECL,e.sgmlDecl="";else if(c(r));else if(f(j,r))e.state=Y.OPEN_TAG,e.tagName=r;else if("/"===r)e.state=Y.CLOSE_TAG,e.tagName="";else if("?"===r)e.state=Y.PROC_INST,e.procInstName=e.procInstBody="";else{if(b(e,"Unencoded <"),e.startTagPosition+1<e.position){var s=e.position-e.startTagPosition;r=new Array(s).join(" ")+r}e.textNode+="<"+r,e.state=Y.TEXT}continue;case Y.SGML_DECL:(e.sgmlDecl+r).toUpperCase()===P?(y(e,"onopencdata"),e.state=Y.CDATA,e.sgmlDecl="",e.cdata=""):e.sgmlDecl+r==="--"?(e.state=Y.COMMENT,e.comment="",e.sgmlDecl=""):(e.sgmlDecl+r).toUpperCase()===F?(e.state=Y.DOCTYPE,(e.doctype||e.sawRoot)&&b(e,"Inappropriately located doctype declaration"),e.doctype="",e.sgmlDecl=""):">"===r?(y(e,"onsgmldeclaration",e.sgmlDecl),e.sgmlDecl="",e.state=Y.TEXT):h(r)?(e.state=Y.SGML_DECL_QUOTED,e.sgmlDecl+=r):e.sgmlDecl+=r;continue;case Y.SGML_DECL_QUOTED:r===e.q&&(e.state=Y.SGML_DECL,e.q=""),e.sgmlDecl+=r;continue;case Y.DOCTYPE:">"===r?(e.state=Y.TEXT,y(e,"ondoctype",e.doctype),e.doctype=!0):(e.doctype+=r,"["===r?e.state=Y.DOCTYPE_DTD:h(r)&&(e.state=Y.DOCTYPE_QUOTED,e.q=r));continue;case Y.DOCTYPE_QUOTED:e.doctype+=r,r===e.q&&(e.q="",e.state=Y.DOCTYPE);continue;case Y.DOCTYPE_DTD:e.doctype+=r,"]"===r?e.state=Y.DOCTYPE:h(r)&&(e.state=Y.DOCTYPE_DTD_QUOTED,e.q=r);continue;case Y.DOCTYPE_DTD_QUOTED:e.doctype+=r,r===e.q&&(e.state=Y.DOCTYPE_DTD,e.q="");continue;case Y.COMMENT:"-"===r?e.state=Y.COMMENT_ENDING:e.comment+=r;continue;case Y.COMMENT_ENDING:"-"===r?(e.state=Y.COMMENT_ENDED,e.comment=m(e.opt,e.comment),e.comment&&y(e,"oncomment",e.comment),e.comment=""):(e.comment+="-"+r,e.state=Y.COMMENT);continue;case Y.COMMENT_ENDED:">"!==r?(b(e,"Malformed comment"),e.comment+="--"+r,e.state=Y.COMMENT):e.state=Y.TEXT;continue;case Y.CDATA:"]"===r?e.state=Y.CDATA_ENDING:e.cdata+=r;continue;case Y.CDATA_ENDING:"]"===r?e.state=Y.CDATA_ENDING_2:(e.cdata+="]"+r,e.state=Y.CDATA);continue;case Y.CDATA_ENDING_2:">"===r?(e.cdata&&y(e,"oncdata",e.cdata),y(e,"onclosecdata"),e.cdata="",e.state=Y.TEXT):"]"===r?e.cdata+="]":(e.cdata+="]]"+r,e.state=Y.CDATA);continue;case Y.PROC_INST:"?"===r?e.state=Y.PROC_INST_ENDING:c(r)?e.state=Y.PROC_INST_BODY:e.procInstName+=r;continue;case Y.PROC_INST_BODY:if(!e.procInstBody&&c(r))continue;"?"===r?e.state=Y.PROC_INST_ENDING:e.procInstBody+=r;continue;case Y.PROC_INST_ENDING:">"===r?(y(e,"onprocessinginstruction",{name:e.procInstName,body:e.procInstBody}),e.procInstName=e.procInstBody="",e.state=Y.TEXT):(e.procInstBody+="?"+r,e.state=Y.PROC_INST_BODY);continue;case Y.OPEN_TAG:f(M,r)?e.tagName+=r:(_(e),">"===r?T(e):"/"===r?e.state=Y.OPEN_TAG_SLASH:(c(r)||b(e,"Invalid character in tag name"),e.state=Y.ATTRIB));continue;case Y.OPEN_TAG_SLASH:">"===r?(T(e,!0),D(e)):(b(e,"Forward-slash in opening tag not followed by >"),e.state=Y.ATTRIB);continue;case Y.ATTRIB:if(c(r))continue;">"===r?T(e):"/"===r?e.state=Y.OPEN_TAG_SLASH:f(j,r)?(e.attribName=r,e.attribValue="",e.state=Y.ATTRIB_NAME):b(e,"Invalid attribute name");continue;case Y.ATTRIB_NAME:"="===r?e.state=Y.ATTRIB_VALUE:">"===r?(b(e,"Attribute without value"),e.attribValue=e.attribName,A(e),T(e)):c(r)?e.state=Y.ATTRIB_NAME_SAW_WHITE:f(M,r)?e.attribName+=r:b(e,"Invalid attribute name");continue;case Y.ATTRIB_NAME_SAW_WHITE:if("="===r)e.state=Y.ATTRIB_VALUE;else{if(c(r))continue;b(e,"Attribute without value"),e.tag.attributes[e.attribName]="",e.attribValue="",y(e,"onattribute",{name:e.attribName,value:""}),e.attribName="",">"===r?T(e):f(j,r)?(e.attribName=r,e.state=Y.ATTRIB_NAME):(b(e,"Invalid attribute name"),e.state=Y.ATTRIB)}continue;case Y.ATTRIB_VALUE:if(c(r))continue;h(r)?(e.q=r,e.state=Y.ATTRIB_VALUE_QUOTED):(b(e,"Unquoted attribute value"),e.state=Y.ATTRIB_VALUE_UNQUOTED,e.attribValue=r);continue;case Y.ATTRIB_VALUE_QUOTED:if(r!==e.q){"&"===r?e.state=Y.ATTRIB_VALUE_ENTITY_Q:e.attribValue+=r;continue}A(e),e.q="",e.state=Y.ATTRIB_VALUE_CLOSED;continue;case Y.ATTRIB_VALUE_CLOSED:c(r)?e.state=Y.ATTRIB:">"===r?T(e):"/"===r?e.state=Y.OPEN_TAG_SLASH:f(j,r)?(b(e,"No whitespace between attributes"),e.attribName=r,e.attribValue="",e.state=Y.ATTRIB_NAME):b(e,"Invalid attribute name");continue;case Y.ATTRIB_VALUE_UNQUOTED:if(!l(r)){"&"===r?e.state=Y.ATTRIB_VALUE_ENTITY_U:e.attribValue+=r;continue}A(e),">"===r?T(e):e.state=Y.ATTRIB;continue;case Y.CLOSE_TAG:if(e.tagName)">"===r?D(e):f(M,r)?e.tagName+=r:e.script?(e.script+="</"+e.tagName,e.tagName="",e.state=Y.SCRIPT):(c(r)||b(e,"Invalid tagname in closing tag"),e.state=Y.CLOSE_TAG_SAW_WHITE);else{if(c(r))continue;p(j,r)?e.script?(e.script+="</"+r,e.state=Y.SCRIPT):b(e,"Invalid tagname in closing tag."):e.tagName=r}continue;case Y.CLOSE_TAG_SAW_WHITE:if(c(r))continue;">"===r?D(e):b(e,"Invalid characters in closing tag");continue;case Y.TEXT_ENTITY:case Y.ATTRIB_VALUE_ENTITY_Q:case Y.ATTRIB_VALUE_ENTITY_U:var a,u;switch(e.state){case Y.TEXT_ENTITY:a=Y.TEXT,u="textNode";break;case Y.ATTRIB_VALUE_ENTITY_Q:a=Y.ATTRIB_VALUE_QUOTED,u="attribValue";break;case Y.ATTRIB_VALUE_ENTITY_U:a=Y.ATTRIB_VALUE_UNQUOTED,u="attribValue"}";"===r?(e[u]+=C(e),e.entity="",e.state=a):f(e.entity.length?q:U,r)?e.entity+=r:(b(e,"Invalid character in entity name"),e[u]+="&"+e.entity+r,e.entity="",e.state=a);continue;default:throw new Error(e,"Unknown state: "+e.state)}}return e.position>=e.bufferCheckPosition&&i(e),e}e.parser=function(t,e){return new r(t,e)},e.SAXParser=r,e.SAXStream=u,e.createStream=a,e.MAX_BUFFER_LENGTH=65536;var O=["comment","sgmlDecl","textNode","tagName","doctype","procInstName","procInstBody","entity","attribName","attribValue","cdata","script"];e.EVENTS=["text","processinginstruction","sgmldeclaration","doctype","comment","opentagstart","attribute","opentag","closetag","opencdata","cdata","closecdata","error","end","ready","script","opennamespace","closenamespace"],Object.create||(Object.create=function(t){function e(){}return e.prototype=t,new e}),Object.keys||(Object.keys=function(t){var e=[];for(var n in t)t.hasOwnProperty(n)&&e.push(n);return e}),r.prototype={end:function(){v(this)},write:I,resume:function(){return this.error=null,this},close:function(){return this.write(null)},flush:function(){s(this)}};var B;try{B=n(72).Stream}catch(t){B=function(){}}var N=e.EVENTS.filter(function(t){return"error"!==t&&"end"!==t});u.prototype=Object.create(B.prototype,{constructor:{value:u}}),u.prototype.write=function(e){if("function"==typeof t&&"function"==typeof t.isBuffer&&t.isBuffer(e)){if(!this._decoder){var r=n(28).StringDecoder;this._decoder=new r("utf8")}e=this._decoder.write(e)}return this._parser.write(e.toString()),this.emit("data",e),!0},u.prototype.end=function(t){return t&&t.length&&this.write(t),this._parser.end(),!0},u.prototype.on=function(t,e){var n=this;return n._parser["on"+t]||-1===N.indexOf(t)||(n._parser["on"+t]=function(){var e=1===arguments.length?[arguments[0]]:Array.apply(null,arguments);e.splice(0,0,t),n.emit.apply(n,e)}),B.prototype.on.call(n,t,e)};var P="[CDATA[",F="DOCTYPE",R="http://www.w3.org/XML/1998/namespace",k="http://www.w3.org/2000/xmlns/",L={xml:R,xmlns:k},j=/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/,M=/[:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/,U=/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD]/,q=/[#:_A-Za-z\u00C0-\u00D6\u00D8-\u00F6\u00F8-\u02FF\u0370-\u037D\u037F-\u1FFF\u200C-\u200D\u2070-\u218F\u2C00-\u2FEF\u3001-\uD7FF\uF900-\uFDCF\uFDF0-\uFFFD\u00B7\u0300-\u036F\u203F-\u2040.\d-]/,Y=0;e.STATE={BEGIN:Y++,BEGIN_WHITESPACE:Y++,TEXT:Y++,TEXT_ENTITY:Y++,OPEN_WAKA:Y++,SGML_DECL:Y++,SGML_DECL_QUOTED:Y++,DOCTYPE:Y++,DOCTYPE_QUOTED:Y++,DOCTYPE_DTD:Y++,DOCTYPE_DTD_QUOTED:Y++,COMMENT_STARTING:Y++,COMMENT:Y++,COMMENT_ENDING:Y++,COMMENT_ENDED:Y++,CDATA:Y++,CDATA_ENDING:Y++,CDATA_ENDING_2:Y++,PROC_INST:Y++,PROC_INST_BODY:Y++,PROC_INST_ENDING:Y++,OPEN_TAG:Y++,OPEN_TAG_SLASH:Y++,ATTRIB:Y++,ATTRIB_NAME:Y++,ATTRIB_NAME_SAW_WHITE:Y++,ATTRIB_VALUE:Y++,ATTRIB_VALUE_QUOTED:Y++,ATTRIB_VALUE_CLOSED:Y++,ATTRIB_VALUE_UNQUOTED:Y++,ATTRIB_VALUE_ENTITY_Q:Y++,ATTRIB_VALUE_ENTITY_U:Y++,CLOSE_TAG:Y++,CLOSE_TAG_SAW_WHITE:Y++,SCRIPT:Y++,SCRIPT_ENDING:Y++},e.XML_ENTITIES={amp:"&",gt:">",lt:"<",quot:'"',apos:"'"},e.ENTITIES={amp:"&",gt:">",lt:"<",quot:'"',apos:"'",AElig:198,Aacute:193,Acirc:194,Agrave:192,Aring:197,Atilde:195,Auml:196,Ccedil:199,ETH:208,Eacute:201,Ecirc:202,Egrave:200,Euml:203,Iacute:205,Icirc:206,Igrave:204,Iuml:207,Ntilde:209,Oacute:211,Ocirc:212,Ograve:210,Oslash:216,Otilde:213,Ouml:214,THORN:222,Uacute:218,Ucirc:219,Ugrave:217,Uuml:220,Yacute:221,aacute:225,acirc:226,aelig:230,agrave:224,aring:229,atilde:227,auml:228,ccedil:231,eacute:233,ecirc:234,egrave:232,eth:240,euml:235,iacute:237,icirc:238,igrave:236,iuml:239,ntilde:241,oacute:243,ocirc:244,ograve:242,oslash:248,otilde:245,ouml:246,szlig:223,thorn:254,uacute:250,ucirc:251,ugrave:249,uuml:252,yacute:253,yuml:255,copy:169,reg:174,nbsp:160,iexcl:161,cent:162,pound:163,curren:164,yen:165,brvbar:166,sect:167,uml:168,ordf:170,laquo:171,not:172,shy:173,macr:175,deg:176,plusmn:177,sup1:185,sup2:178,sup3:179,acute:180,micro:181,para:182,middot:183,cedil:184,ordm:186,raquo:187,frac14:188,frac12:189,frac34:190,iquest:191,times:215,divide:247,OElig:338,oelig:339,Scaron:352,scaron:353,Yuml:376,fnof:402,circ:710,tilde:732,Alpha:913,Beta:914,Gamma:915,Delta:916,Epsilon:917,Zeta:918,Eta:919,Theta:920,Iota:921,Kappa:922,Lambda:923,Mu:924,Nu:925,Xi:926,Omicron:927,Pi:928,Rho:929,Sigma:931,Tau:932,Upsilon:933,Phi:934,Chi:935,Psi:936,Omega:937,alpha:945,beta:946,gamma:947,delta:948,epsilon:949,zeta:950,eta:951,theta:952,iota:953,kappa:954,lambda:955,mu:956,nu:957,xi:958,omicron:959,pi:960,rho:961,sigmaf:962,sigma:963,tau:964,upsilon:965,phi:966,chi:967,psi:968,omega:969,thetasym:977,upsih:978,piv:982,ensp:8194,emsp:8195,thinsp:8201,zwnj:8204,zwj:8205,lrm:8206,rlm:8207,ndash:8211,mdash:8212,lsquo:8216,rsquo:8217,sbquo:8218,ldquo:8220,rdquo:8221,bdquo:8222,dagger:8224,Dagger:8225,bull:8226,hellip:8230,permil:8240,prime:8242,Prime:8243,lsaquo:8249,rsaquo:8250,oline:8254,frasl:8260,euro:8364,image:8465,weierp:8472,real:8476,trade:8482,alefsym:8501,larr:8592,uarr:8593,rarr:8594,darr:8595,harr:8596,crarr:8629,lArr:8656,uArr:8657,rArr:8658,dArr:8659,hArr:8660,forall:8704,part:8706,exist:8707,empty:8709,nabla:8711,isin:8712,notin:8713,ni:8715,prod:8719,sum:8721,minus:8722,lowast:8727,radic:8730,prop:8733,infin:8734,ang:8736,and:8743,or:8744,cap:8745,cup:8746,int:8747,there4:8756,sim:8764,cong:8773,asymp:8776,ne:8800,equiv:8801,le:8804,ge:8805,sub:8834,sup:8835,nsub:8836,sube:8838,supe:8839,oplus:8853,otimes:8855,perp:8869,sdot:8901,lceil:8968,rceil:8969,lfloor:8970,rfloor:8971,lang:9001,rang:9002,loz:9674,spades:9824,clubs:9827,hearts:9829,diams:9830},Object.keys(e.ENTITIES).forEach(function(t){var n=e.ENTITIES[t],r="number"==typeof n?String.fromCharCode(n):n;e.ENTITIES[t]=r});for(var V in e.STATE)e.STATE[e.STATE[V]]=V;Y=e.STATE,String.fromCodePoint||function(){var t=String.fromCharCode,e=Math.floor,n=function(){var n,r,i=[],o=-1,s=arguments.length;if(!s)return"";for(var a="";++o<s;){var u=Number(arguments[o]);if(!isFinite(u)||u<0||u>1114111||e(u)!==u)throw RangeError("Invalid code point: "+u);u<=65535?i.push(u):(u-=65536,n=55296+(u>>10),r=u%1024+56320,i.push(n,r)),(o+1===s||i.length>16384)&&(a+=t.apply(null,i),i.length=0)}return a};Object.defineProperty?Object.defineProperty(String,"fromCodePoint",{value:n,configurable:!0,writable:!0}):String.fromCodePoint=n}()}(e)}).call(e,n(25).Buffer)},function(t,e,n){"use strict";function r(t){var e=t.length;if(e%4>0)throw new Error("Invalid string. Length must be a multiple of 4");return"="===t[e-2]?2:"="===t[e-1]?1:0}function i(t){return 3*t.length/4-r(t)}function o(t){var e,n,i,o,s,a=t.length;o=r(t),s=new l(3*a/4-o),n=o>0?a-4:a;var u=0;for(e=0;e<n;e+=4)i=h[t.charCodeAt(e)]<<18|h[t.charCodeAt(e+1)]<<12|h[t.charCodeAt(e+2)]<<6|h[t.charCodeAt(e+3)],s[u++]=i>>16&255,s[u++]=i>>8&255,s[u++]=255&i;return 2===o?(i=h[t.charCodeAt(e)]<<2|h[t.charCodeAt(e+1)]>>4,s[u++]=255&i):1===o&&(i=h[t.charCodeAt(e)]<<10|h[t.charCodeAt(e+1)]<<4|h[t.charCodeAt(e+2)]>>2,s[u++]=i>>8&255,s[u++]=255&i),s}function s(t){return c[t>>18&63]+c[t>>12&63]+c[t>>6&63]+c[63&t]}function a(t,e,n){for(var r,i=[],o=e;o<n;o+=3)r=(t[o]<<16&16711680)+(t[o+1]<<8&65280)+(255&t[o+2]),i.push(s(r));return i.join("")}function u(t){for(var e,n=t.length,r=n%3,i="",o=[],s=0,u=n-r;s<u;s+=16383)o.push(a(t,s,s+16383>u?u:s+16383));return 1===r?(e=t[n-1],i+=c[e>>2],i+=c[e<<4&63],i+="=="):2===r&&(e=(t[n-2]<<8)+t[n-1],i+=c[e>>10],i+=c[e>>4&63],i+=c[e<<2&63],i+="="),o.push(i),o.join("")}e.byteLength=i,e.toByteArray=o,e.fromByteArray=u;for(var c=[],h=[],l="undefined"!=typeof Uint8Array?Uint8Array:Array,f="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",p=0,d=f.length;p<d;++p)c[p]=f[p],h[f.charCodeAt(p)]=p;h["-".charCodeAt(0)]=62,h["_".charCodeAt(0)]=63},function(t,e){e.read=function(t,e,n,r,i){var o,s,a=8*i-r-1,u=(1<<a)-1,c=u>>1,h=-7,l=n?i-1:0,f=n?-1:1,p=t[e+l];for(l+=f,o=p&(1<<-h)-1,p>>=-h,h+=a;h>0;o=256*o+t[e+l],l+=f,h-=8);for(s=o&(1<<-h)-1,o>>=-h,h+=r;h>0;s=256*s+t[e+l],l+=f,h-=8);if(0===o)o=1-c;else{if(o===u)return s?NaN:1/0*(p?-1:1);s+=Math.pow(2,r),o-=c}return(p?-1:1)*s*Math.pow(2,o-r)},e.write=function(t,e,n,r,i,o){var s,a,u,c=8*o-i-1,h=(1<<c)-1,l=h>>1,f=23===i?Math.pow(2,-24)-Math.pow(2,-77):0,p=r?0:o-1,d=r?1:-1,y=e<0||0===e&&1/e<0?1:0;for(e=Math.abs(e),isNaN(e)||e===1/0?(a=isNaN(e)?1:0,s=h):(s=Math.floor(Math.log(e)/Math.LN2),e*(u=Math.pow(2,-s))<1&&(s--,u*=2),e+=s+l>=1?f/u:f*Math.pow(2,1-l),e*u>=2&&(s++,u/=2),s+l>=h?(a=0,s=h):s+l>=1?(a=(e*u-1)*Math.pow(2,i),s+=l):(a=e*Math.pow(2,l-1)*Math.pow(2,i),s=0));i>=8;t[n+p]=255&a,p+=d,a/=256,i-=8);for(s=s<<i|a,c+=i;c>0;t[n+p]=255&s,p+=d,s/=256,c-=8);t[n+p-d]|=128*y}},function(t,e,n){function r(){i.call(this)}t.exports=r;var i=n(19).EventEmitter;n(5)(r,i),r.Readable=n(26),r.Writable=n(79),r.Duplex=n(80),r.Transform=n(81),r.PassThrough=n(82),r.Stream=r,r.prototype.pipe=function(t,e){function n(e){t.writable&&!1===t.write(e)&&c.pause&&c.pause()}function r(){c.readable&&c.resume&&c.resume()}function o(){h||(h=!0,t.end())}function s(){h||(h=!0,"function"==typeof t.destroy&&t.destroy())}function a(t){if(u(),0===i.listenerCount(this,"error"))throw t}function u(){c.removeListener("data",n),t.removeListener("drain",r),c.removeListener("end",o),c.removeListener("close",s),c.removeListener("error",a),t.removeListener("error",a),c.removeListener("end",u),c.removeListener("close",u),t.removeListener("close",u)}var c=this;c.on("data",n),t.on("drain",r),t._isStdio||e&&!1===e.end||(c.on("end",o),c.on("close",s));var h=!1;return c.on("error",a),t.on("error",a),c.on("end",u),c.on("close",u),t.on("close",u),t.emit("pipe",c),t}},function(t,e){},function(t,e,n){"use strict";function r(t,e){if(!(t instanceof e))throw new TypeError("Cannot call a class as a function")}function i(t,e,n){t.copy(e,n)}var o=n(22).Buffer,s=n(75);t.exports=function(){function t(){r(this,t),this.head=null,this.tail=null,this.length=0}return t.prototype.push=function(t){var e={data:t,next:null};this.length>0?this.tail.next=e:this.head=e,this.tail=e,++this.length},t.prototype.unshift=function(t){var e={data:t,next:this.head};0===this.length&&(this.tail=e),this.head=e,++this.length},t.prototype.shift=function(){if(0!==this.length){var t=this.head.data;return 1===this.length?this.head=this.tail=null:this.head=this.head.next,--this.length,t}},t.prototype.clear=function(){this.head=this.tail=null,this.length=0},t.prototype.join=function(t){if(0===this.length)return"";for(var e=this.head,n=""+e.data;e=e.next;)n+=t+e.data;return n},t.prototype.concat=function(t){if(0===this.length)return o.alloc(0);if(1===this.length)return this.head.data;for(var e=o.allocUnsafe(t>>>0),n=this.head,r=0;n;)i(n.data,e,r),r+=n.data.length,n=n.next;return e},t}(),s&&s.inspect&&s.inspect.custom&&(t.exports.prototype[s.inspect.custom]=function(){var t=s.inspect({length:this.length});return this.constructor.name+" "+t})},function(t,e){},function(t,e,n){(function(t,e){!function(t,n){"use strict";function r(t){"function"!=typeof t&&(t=new Function(""+t));for(var e=new Array(arguments.length-1),n=0;n<e.length;n++)e[n]=arguments[n+1];var r={callback:t,args:e};return c[u]=r,a(u),u++}function i(t){delete c[t]}function o(t){var e=t.callback,r=t.args;switch(r.length){case 0:e();break;case 1:e(r[0]);break;case 2:e(r[0],r[1]);break;case 3:e(r[0],r[1],r[2]);break;default:e.apply(n,r)}}function s(t){if(h)setTimeout(s,0,t);else{var e=c[t];if(e){h=!0;try{o(e)}finally{i(t),h=!1}}}}if(!t.setImmediate){var a,u=1,c={},h=!1,l=t.document,f=Object.getPrototypeOf&&Object.getPrototypeOf(t);f=f&&f.setTimeout?f:t,"[object process]"==={}.toString.call(t.process)?function(){a=function(t){e.nextTick(function(){s(t)})}}():function(){if(t.postMessage&&!t.importScripts){var e=!0,n=t.onmessage;return t.onmessage=function(){e=!1},t.postMessage("","*"),t.onmessage=n,e}}()?function(){var e="setImmediate$"+Math.random()+"$",n=function(n){n.source===t&&"string"==typeof n.data&&0===n.data.indexOf(e)&&s(+n.data.slice(e.length))};t.addEventListener?t.addEventListener("message",n,!1):t.attachEvent("onmessage",n),a=function(n){t.postMessage(e+n,"*")}}():t.MessageChannel?function(){var t=new MessageChannel;t.port1.onmessage=function(t){s(t.data)},a=function(e){t.port2.postMessage(e)}}():l&&"onreadystatechange"in l.createElement("script")?function(){var t=l.documentElement;a=function(e){var n=l.createElement("script");n.onreadystatechange=function(){s(e),n.onreadystatechange=null,t.removeChild(n),n=null},t.appendChild(n)}}():function(){a=function(t){setTimeout(s,0,t)}}(),f.setImmediate=r,f.clearImmediate=i}}("undefined"==typeof self?void 0===t?this:t:self)}).call(e,n(1),n(20))},function(t,e,n){(function(e){function n(t,e){function n(){if(!i){if(r("throwDeprecation"))throw new Error(e);r("traceDeprecation")?console.trace(e):console.warn(e),i=!0}return t.apply(this,arguments)}if(r("noDeprecation"))return t;var i=!1;return n}function r(t){try{if(!e.localStorage)return!1}catch(t){return!1}var n=e.localStorage[t];return null!=n&&"true"===String(n).toLowerCase()}t.exports=n}).call(e,n(1))},function(t,e,n){"use strict";function r(t){if(!(this instanceof r))return new r(t);i.call(this,t)}t.exports=r;var i=n(39),o=n(6);o.inherits=n(5),o.inherits(r,i),r.prototype._transform=function(t,e,n){n(null,t)}},function(t,e,n){t.exports=n(27)},function(t,e,n){t.exports=n(3)},function(t,e,n){t.exports=n(26).Transform},function(t,e,n){t.exports=n(26).PassThrough},function(t,e){(function(){"use strict";e.stripBOM=function(t){return"\ufeff"===t[0]?t.substring(1):t}}).call(this)},function(t,e){t.exports={name:"osm-request",description:"Request the OSM API from Javascript, with promises :)",version:"1.1.2",homepage:"https://github.com/osmlab/osm-request/",repository:"https://github.com/osmlab/osm-request/",bugs:"https://github.com/osmlab/osm-request/issues",author:"OpenStreetMap developers",license:"MIT",keywords:["osm","openstreetmap","request","api"],main:"dist/OsmRequest.js",files:["dist"],moduleRoots:["node_modules","src"],scripts:{watch:"cross-env NODE_PATH=src webpack -w --progress",build:"cross-env NODE_ENV=production NODE_PATH=src webpack --progress",precommit:"lint-staged",test:"cross-env NODE_PATH=src jest --env=jsdom","test-watch":"npm test -- --coverage --watch","test-ci":"npm test -- --ci --coverage","test-prettier":"prettier --single-quote --list-different 'src/**/*.{js,json}'",lint:"eslint 'src/**/*.{js,json}'",doc:"npm run doc:lint && documentation build ./src/* -f md > API.md","doc:lint":"documentation lint ./src/*",preversion:"npm run test-ci && npm run build",postversion:"git push && git push --tags"},jest:{collectCoverageFrom:["src/**/*.js","!<rootDir>/node_modules/"],coveragePathIgnorePatterns:["<rootDir>/src/requests.js","<rootDir>/src/helpers/time.js","<rootDir>/node_modules/"],coverageReporters:["json","lcov"]},prettier:{semi:!0,singleQuote:!0},"lint-staged":{"src/**/*.{js,json}":["prettier --single-quote --write","eslint","git add"],"src/**/*.js":["npm run test-ci -- --findRelatedTests","npm run doc","git add API.md"]},devDependencies:{"babel-core":"^6.26.0","babel-eslint":"^8.0.1","babel-loader":"^7.1.3","babel-preset-env":"^1.6.0","babel-preset-stage-0":"^6.24.1",coveralls:"^3.0.0","cross-env":"^5.1.1",documentation:"^6.0.0",eslint:"^4.18.2","eslint-config-prettier":"^2.6.0","eslint-plugin-import":"^2.7.0","eslint-plugin-jest":"^21.13.0","eslint-plugin-json":"^1.2.0",husky:"^0.14.3",jest:"^22.4.2","lint-staged":"^7.0.0",prettier:"^1.11.1",webpack:"^3.11.0"},dependencies:{"cross-fetch":"^2.1.0","osm-auth":"^1.0.2",xml2js:"^0.4.19"}}},function(t,e,n){"use strict";function r(t){this.message=t,this.name="RequestException"}Object.defineProperty(e,"__esModule",{value:!0}),e.RequestException=r}]).default});
},{}],5:[function(require,module,exports){
// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

void (function(root, factory) {
  if (typeof define === "function" && define.amd) {
    define(factory)
  } else if (typeof exports === "object") {
    module.exports = factory()
  } else {
    root.resolveUrl = factory()
  }
}(this, function() {

  function resolveUrl(/* ...urls */) {
    var numUrls = arguments.length

    if (numUrls === 0) {
      throw new Error("resolveUrl requires at least one argument; got none.")
    }

    var base = document.createElement("base")
    base.href = arguments[0]

    if (numUrls === 1) {
      return base.href
    }

    var head = document.getElementsByTagName("head")[0]
    head.insertBefore(base, head.firstChild)

    var a = document.createElement("a")
    var resolved

    for (var index = 1; index < numUrls; index++) {
      a.href = arguments[index]
      resolved = a.href
      base.href = resolved
    }

    head.removeChild(base)

    return resolved
  }

  return resolveUrl

}));

},{}],6:[function(require,module,exports){
var engine = require('../src/store-engine')

var storages = require('../storages/all')
var plugins = [require('../plugins/json2')]

module.exports = engine.createStore(storages, plugins)

},{"../plugins/json2":7,"../src/store-engine":9,"../storages/all":11}],7:[function(require,module,exports){
module.exports = json2Plugin

function json2Plugin() {
	require('./lib/json2')
	return {}
}

},{"./lib/json2":8}],8:[function(require,module,exports){
/* eslint-disable */

//  json2.js
//  2016-10-28
//  Public Domain.
//  NO WARRANTY EXPRESSED OR IMPLIED. USE AT YOUR OWN RISK.
//  See http://www.JSON.org/js.html
//  This code should be minified before deployment.
//  See http://javascript.crockford.com/jsmin.html

//  USE YOUR OWN COPY. IT IS EXTREMELY UNWISE TO LOAD CODE FROM SERVERS YOU DO
//  NOT CONTROL.

//  This file creates a global JSON object containing two methods: stringify
//  and parse. This file provides the ES5 JSON capability to ES3 systems.
//  If a project might run on IE8 or earlier, then this file should be included.
//  This file does nothing on ES5 systems.

//      JSON.stringify(value, replacer, space)
//          value       any JavaScript value, usually an object or array.
//          replacer    an optional parameter that determines how object
//                      values are stringified for objects. It can be a
//                      function or an array of strings.
//          space       an optional parameter that specifies the indentation
//                      of nested structures. If it is omitted, the text will
//                      be packed without extra whitespace. If it is a number,
//                      it will specify the number of spaces to indent at each
//                      level. If it is a string (such as "\t" or "&nbsp;"),
//                      it contains the characters used to indent at each level.
//          This method produces a JSON text from a JavaScript value.
//          When an object value is found, if the object contains a toJSON
//          method, its toJSON method will be called and the result will be
//          stringified. A toJSON method does not serialize: it returns the
//          value represented by the name/value pair that should be serialized,
//          or undefined if nothing should be serialized. The toJSON method
//          will be passed the key associated with the value, and this will be
//          bound to the value.

//          For example, this would serialize Dates as ISO strings.

//              Date.prototype.toJSON = function (key) {
//                  function f(n) {
//                      // Format integers to have at least two digits.
//                      return (n < 10)
//                          ? "0" + n
//                          : n;
//                  }
//                  return this.getUTCFullYear()   + "-" +
//                       f(this.getUTCMonth() + 1) + "-" +
//                       f(this.getUTCDate())      + "T" +
//                       f(this.getUTCHours())     + ":" +
//                       f(this.getUTCMinutes())   + ":" +
//                       f(this.getUTCSeconds())   + "Z";
//              };

//          You can provide an optional replacer method. It will be passed the
//          key and value of each member, with this bound to the containing
//          object. The value that is returned from your method will be
//          serialized. If your method returns undefined, then the member will
//          be excluded from the serialization.

//          If the replacer parameter is an array of strings, then it will be
//          used to select the members to be serialized. It filters the results
//          such that only members with keys listed in the replacer array are
//          stringified.

//          Values that do not have JSON representations, such as undefined or
//          functions, will not be serialized. Such values in objects will be
//          dropped; in arrays they will be replaced with null. You can use
//          a replacer function to replace those with JSON values.

//          JSON.stringify(undefined) returns undefined.

//          The optional space parameter produces a stringification of the
//          value that is filled with line breaks and indentation to make it
//          easier to read.

//          If the space parameter is a non-empty string, then that string will
//          be used for indentation. If the space parameter is a number, then
//          the indentation will be that many spaces.

//          Example:

//          text = JSON.stringify(["e", {pluribus: "unum"}]);
//          // text is '["e",{"pluribus":"unum"}]'

//          text = JSON.stringify(["e", {pluribus: "unum"}], null, "\t");
//          // text is '[\n\t"e",\n\t{\n\t\t"pluribus": "unum"\n\t}\n]'

//          text = JSON.stringify([new Date()], function (key, value) {
//              return this[key] instanceof Date
//                  ? "Date(" + this[key] + ")"
//                  : value;
//          });
//          // text is '["Date(---current time---)"]'

//      JSON.parse(text, reviver)
//          This method parses a JSON text to produce an object or array.
//          It can throw a SyntaxError exception.

//          The optional reviver parameter is a function that can filter and
//          transform the results. It receives each of the keys and values,
//          and its return value is used instead of the original value.
//          If it returns what it received, then the structure is not modified.
//          If it returns undefined then the member is deleted.

//          Example:

//          // Parse the text. Values that look like ISO date strings will
//          // be converted to Date objects.

//          myData = JSON.parse(text, function (key, value) {
//              var a;
//              if (typeof value === "string") {
//                  a =
//   /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}(?:\.\d*)?)Z$/.exec(value);
//                  if (a) {
//                      return new Date(Date.UTC(+a[1], +a[2] - 1, +a[3], +a[4],
//                          +a[5], +a[6]));
//                  }
//              }
//              return value;
//          });

//          myData = JSON.parse('["Date(09/09/2001)"]', function (key, value) {
//              var d;
//              if (typeof value === "string" &&
//                      value.slice(0, 5) === "Date(" &&
//                      value.slice(-1) === ")") {
//                  d = new Date(value.slice(5, -1));
//                  if (d) {
//                      return d;
//                  }
//              }
//              return value;
//          });

//  This is a reference implementation. You are free to copy, modify, or
//  redistribute.

/*jslint
    eval, for, this
*/

/*property
    JSON, apply, call, charCodeAt, getUTCDate, getUTCFullYear, getUTCHours,
    getUTCMinutes, getUTCMonth, getUTCSeconds, hasOwnProperty, join,
    lastIndex, length, parse, prototype, push, replace, slice, stringify,
    test, toJSON, toString, valueOf
*/


// Create a JSON object only if one does not already exist. We create the
// methods in a closure to avoid creating global variables.

if (typeof JSON !== "object") {
    JSON = {};
}

(function () {
    "use strict";

    var rx_one = /^[\],:{}\s]*$/;
    var rx_two = /\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g;
    var rx_three = /"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g;
    var rx_four = /(?:^|:|,)(?:\s*\[)+/g;
    var rx_escapable = /[\\"\u0000-\u001f\u007f-\u009f\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    var rx_dangerous = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;

    function f(n) {
        // Format integers to have at least two digits.
        return n < 10
            ? "0" + n
            : n;
    }

    function this_value() {
        return this.valueOf();
    }

    if (typeof Date.prototype.toJSON !== "function") {

        Date.prototype.toJSON = function () {

            return isFinite(this.valueOf())
                ? this.getUTCFullYear() + "-" +
                        f(this.getUTCMonth() + 1) + "-" +
                        f(this.getUTCDate()) + "T" +
                        f(this.getUTCHours()) + ":" +
                        f(this.getUTCMinutes()) + ":" +
                        f(this.getUTCSeconds()) + "Z"
                : null;
        };

        Boolean.prototype.toJSON = this_value;
        Number.prototype.toJSON = this_value;
        String.prototype.toJSON = this_value;
    }

    var gap;
    var indent;
    var meta;
    var rep;


    function quote(string) {

// If the string contains no control characters, no quote characters, and no
// backslash characters, then we can safely slap some quotes around it.
// Otherwise we must also replace the offending characters with safe escape
// sequences.

        rx_escapable.lastIndex = 0;
        return rx_escapable.test(string)
            ? "\"" + string.replace(rx_escapable, function (a) {
                var c = meta[a];
                return typeof c === "string"
                    ? c
                    : "\\u" + ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
            }) + "\""
            : "\"" + string + "\"";
    }


    function str(key, holder) {

// Produce a string from holder[key].

        var i;          // The loop counter.
        var k;          // The member key.
        var v;          // The member value.
        var length;
        var mind = gap;
        var partial;
        var value = holder[key];

// If the value has a toJSON method, call it to obtain a replacement value.

        if (value && typeof value === "object" &&
                typeof value.toJSON === "function") {
            value = value.toJSON(key);
        }

// If we were called with a replacer function, then call the replacer to
// obtain a replacement value.

        if (typeof rep === "function") {
            value = rep.call(holder, key, value);
        }

// What happens next depends on the value's type.

        switch (typeof value) {
        case "string":
            return quote(value);

        case "number":

// JSON numbers must be finite. Encode non-finite numbers as null.

            return isFinite(value)
                ? String(value)
                : "null";

        case "boolean":
        case "null":

// If the value is a boolean or null, convert it to a string. Note:
// typeof null does not produce "null". The case is included here in
// the remote chance that this gets fixed someday.

            return String(value);

// If the type is "object", we might be dealing with an object or an array or
// null.

        case "object":

// Due to a specification blunder in ECMAScript, typeof null is "object",
// so watch out for that case.

            if (!value) {
                return "null";
            }

// Make an array to hold the partial results of stringifying this object value.

            gap += indent;
            partial = [];

// Is the value an array?

            if (Object.prototype.toString.apply(value) === "[object Array]") {

// The value is an array. Stringify every element. Use null as a placeholder
// for non-JSON values.

                length = value.length;
                for (i = 0; i < length; i += 1) {
                    partial[i] = str(i, value) || "null";
                }

// Join all of the elements together, separated with commas, and wrap them in
// brackets.

                v = partial.length === 0
                    ? "[]"
                    : gap
                        ? "[\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "]"
                        : "[" + partial.join(",") + "]";
                gap = mind;
                return v;
            }

// If the replacer is an array, use it to select the members to be stringified.

            if (rep && typeof rep === "object") {
                length = rep.length;
                for (i = 0; i < length; i += 1) {
                    if (typeof rep[i] === "string") {
                        k = rep[i];
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                gap
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            } else {

// Otherwise, iterate through all of the keys in the object.

                for (k in value) {
                    if (Object.prototype.hasOwnProperty.call(value, k)) {
                        v = str(k, value);
                        if (v) {
                            partial.push(quote(k) + (
                                gap
                                    ? ": "
                                    : ":"
                            ) + v);
                        }
                    }
                }
            }

// Join all of the member texts together, separated with commas,
// and wrap them in braces.

            v = partial.length === 0
                ? "{}"
                : gap
                    ? "{\n" + gap + partial.join(",\n" + gap) + "\n" + mind + "}"
                    : "{" + partial.join(",") + "}";
            gap = mind;
            return v;
        }
    }

// If the JSON object does not yet have a stringify method, give it one.

    if (typeof JSON.stringify !== "function") {
        meta = {    // table of character substitutions
            "\b": "\\b",
            "\t": "\\t",
            "\n": "\\n",
            "\f": "\\f",
            "\r": "\\r",
            "\"": "\\\"",
            "\\": "\\\\"
        };
        JSON.stringify = function (value, replacer, space) {

// The stringify method takes a value and an optional replacer, and an optional
// space parameter, and returns a JSON text. The replacer can be a function
// that can replace values, or an array of strings that will select the keys.
// A default replacer method can be provided. Use of the space parameter can
// produce text that is more easily readable.

            var i;
            gap = "";
            indent = "";

// If the space parameter is a number, make an indent string containing that
// many spaces.

            if (typeof space === "number") {
                for (i = 0; i < space; i += 1) {
                    indent += " ";
                }

// If the space parameter is a string, it will be used as the indent string.

            } else if (typeof space === "string") {
                indent = space;
            }

// If there is a replacer, it must be a function or an array.
// Otherwise, throw an error.

            rep = replacer;
            if (replacer && typeof replacer !== "function" &&
                    (typeof replacer !== "object" ||
                    typeof replacer.length !== "number")) {
                throw new Error("JSON.stringify");
            }

// Make a fake root object containing our value under the key of "".
// Return the result of stringifying the value.

            return str("", {"": value});
        };
    }


// If the JSON object does not yet have a parse method, give it one.

    if (typeof JSON.parse !== "function") {
        JSON.parse = function (text, reviver) {

// The parse method takes a text and an optional reviver function, and returns
// a JavaScript value if the text is a valid JSON text.

            var j;

            function walk(holder, key) {

// The walk method is used to recursively walk the resulting structure so
// that modifications can be made.

                var k;
                var v;
                var value = holder[key];
                if (value && typeof value === "object") {
                    for (k in value) {
                        if (Object.prototype.hasOwnProperty.call(value, k)) {
                            v = walk(value, k);
                            if (v !== undefined) {
                                value[k] = v;
                            } else {
                                delete value[k];
                            }
                        }
                    }
                }
                return reviver.call(holder, key, value);
            }


// Parsing happens in four stages. In the first stage, we replace certain
// Unicode characters with escape sequences. JavaScript handles many characters
// incorrectly, either silently deleting them, or treating them as line endings.

            text = String(text);
            rx_dangerous.lastIndex = 0;
            if (rx_dangerous.test(text)) {
                text = text.replace(rx_dangerous, function (a) {
                    return "\\u" +
                            ("0000" + a.charCodeAt(0).toString(16)).slice(-4);
                });
            }

// In the second stage, we run the text against regular expressions that look
// for non-JSON patterns. We are especially concerned with "()" and "new"
// because they can cause invocation, and "=" because it can cause mutation.
// But just to be safe, we want to reject all unexpected forms.

// We split the second stage into 4 regexp operations in order to work around
// crippling inefficiencies in IE's and Safari's regexp engines. First we
// replace the JSON backslash pairs with "@" (a non-JSON character). Second, we
// replace all simple value tokens with "]" characters. Third, we delete all
// open brackets that follow a colon or comma or that begin the text. Finally,
// we look to see that the remaining characters are only whitespace or "]" or
// "," or ":" or "{" or "}". If that is so, then the text is safe for eval.

            if (
                rx_one.test(
                    text
                        .replace(rx_two, "@")
                        .replace(rx_three, "]")
                        .replace(rx_four, "")
                )
            ) {

// In the third stage we use the eval function to compile the text into a
// JavaScript structure. The "{" operator is subject to a syntactic ambiguity
// in JavaScript: it can begin a block or an object literal. We wrap the text
// in parens to eliminate the ambiguity.

                j = eval("(" + text + ")");

// In the optional fourth stage, we recursively walk the new structure, passing
// each name/value pair to a reviver function for possible transformation.

                return (typeof reviver === "function")
                    ? walk({"": j}, "")
                    : j;
            }

// If the text is not JSON parseable, then a SyntaxError is thrown.

            throw new SyntaxError("JSON.parse");
        };
    }
}());
},{}],9:[function(require,module,exports){
var util = require('./util')
var slice = util.slice
var pluck = util.pluck
var each = util.each
var bind = util.bind
var create = util.create
var isList = util.isList
var isFunction = util.isFunction
var isObject = util.isObject

module.exports = {
	createStore: createStore
}

var storeAPI = {
	version: '2.0.12',
	enabled: false,
	
	// get returns the value of the given key. If that value
	// is undefined, it returns optionalDefaultValue instead.
	get: function(key, optionalDefaultValue) {
		var data = this.storage.read(this._namespacePrefix + key)
		return this._deserialize(data, optionalDefaultValue)
	},

	// set will store the given value at key and returns value.
	// Calling set with value === undefined is equivalent to calling remove.
	set: function(key, value) {
		if (value === undefined) {
			return this.remove(key)
		}
		this.storage.write(this._namespacePrefix + key, this._serialize(value))
		return value
	},

	// remove deletes the key and value stored at the given key.
	remove: function(key) {
		this.storage.remove(this._namespacePrefix + key)
	},

	// each will call the given callback once for each key-value pair
	// in this store.
	each: function(callback) {
		var self = this
		this.storage.each(function(val, namespacedKey) {
			callback.call(self, self._deserialize(val), (namespacedKey || '').replace(self._namespaceRegexp, ''))
		})
	},

	// clearAll will remove all the stored key-value pairs in this store.
	clearAll: function() {
		this.storage.clearAll()
	},

	// additional functionality that can't live in plugins
	// ---------------------------------------------------

	// hasNamespace returns true if this store instance has the given namespace.
	hasNamespace: function(namespace) {
		return (this._namespacePrefix == '__storejs_'+namespace+'_')
	},

	// createStore creates a store.js instance with the first
	// functioning storage in the list of storage candidates,
	// and applies the the given mixins to the instance.
	createStore: function() {
		return createStore.apply(this, arguments)
	},
	
	addPlugin: function(plugin) {
		this._addPlugin(plugin)
	},
	
	namespace: function(namespace) {
		return createStore(this.storage, this.plugins, namespace)
	}
}

function _warn() {
	var _console = (typeof console == 'undefined' ? null : console)
	if (!_console) { return }
	var fn = (_console.warn ? _console.warn : _console.log)
	fn.apply(_console, arguments)
}

function createStore(storages, plugins, namespace) {
	if (!namespace) {
		namespace = ''
	}
	if (storages && !isList(storages)) {
		storages = [storages]
	}
	if (plugins && !isList(plugins)) {
		plugins = [plugins]
	}

	var namespacePrefix = (namespace ? '__storejs_'+namespace+'_' : '')
	var namespaceRegexp = (namespace ? new RegExp('^'+namespacePrefix) : null)
	var legalNamespaces = /^[a-zA-Z0-9_\-]*$/ // alpha-numeric + underscore and dash
	if (!legalNamespaces.test(namespace)) {
		throw new Error('store.js namespaces can only have alphanumerics + underscores and dashes')
	}
	
	var _privateStoreProps = {
		_namespacePrefix: namespacePrefix,
		_namespaceRegexp: namespaceRegexp,

		_testStorage: function(storage) {
			try {
				var testStr = '__storejs__test__'
				storage.write(testStr, testStr)
				var ok = (storage.read(testStr) === testStr)
				storage.remove(testStr)
				return ok
			} catch(e) {
				return false
			}
		},

		_assignPluginFnProp: function(pluginFnProp, propName) {
			var oldFn = this[propName]
			this[propName] = function pluginFn() {
				var args = slice(arguments, 0)
				var self = this

				// super_fn calls the old function which was overwritten by
				// this mixin.
				function super_fn() {
					if (!oldFn) { return }
					each(arguments, function(arg, i) {
						args[i] = arg
					})
					return oldFn.apply(self, args)
				}

				// Give mixing function access to super_fn by prefixing all mixin function
				// arguments with super_fn.
				var newFnArgs = [super_fn].concat(args)

				return pluginFnProp.apply(self, newFnArgs)
			}
		},

		_serialize: function(obj) {
			return JSON.stringify(obj)
		},

		_deserialize: function(strVal, defaultVal) {
			if (!strVal) { return defaultVal }
			// It is possible that a raw string value has been previously stored
			// in a storage without using store.js, meaning it will be a raw
			// string value instead of a JSON serialized string. By defaulting
			// to the raw string value in case of a JSON parse error, we allow
			// for past stored values to be forwards-compatible with store.js
			var val = ''
			try { val = JSON.parse(strVal) }
			catch(e) { val = strVal }

			return (val !== undefined ? val : defaultVal)
		},
		
		_addStorage: function(storage) {
			if (this.enabled) { return }
			if (this._testStorage(storage)) {
				this.storage = storage
				this.enabled = true
			}
		},

		_addPlugin: function(plugin) {
			var self = this

			// If the plugin is an array, then add all plugins in the array.
			// This allows for a plugin to depend on other plugins.
			if (isList(plugin)) {
				each(plugin, function(plugin) {
					self._addPlugin(plugin)
				})
				return
			}

			// Keep track of all plugins we've seen so far, so that we
			// don't add any of them twice.
			var seenPlugin = pluck(this.plugins, function(seenPlugin) {
				return (plugin === seenPlugin)
			})
			if (seenPlugin) {
				return
			}
			this.plugins.push(plugin)

			// Check that the plugin is properly formed
			if (!isFunction(plugin)) {
				throw new Error('Plugins must be function values that return objects')
			}

			var pluginProperties = plugin.call(this)
			if (!isObject(pluginProperties)) {
				throw new Error('Plugins must return an object of function properties')
			}

			// Add the plugin function properties to this store instance.
			each(pluginProperties, function(pluginFnProp, propName) {
				if (!isFunction(pluginFnProp)) {
					throw new Error('Bad plugin property: '+propName+' from plugin '+plugin.name+'. Plugins should only return functions.')
				}
				self._assignPluginFnProp(pluginFnProp, propName)
			})
		},
		
		// Put deprecated properties in the private API, so as to not expose it to accidential
		// discovery through inspection of the store object.
		
		// Deprecated: addStorage
		addStorage: function(storage) {
			_warn('store.addStorage(storage) is deprecated. Use createStore([storages])')
			this._addStorage(storage)
		}
	}

	var store = create(_privateStoreProps, storeAPI, {
		plugins: []
	})
	store.raw = {}
	each(store, function(prop, propName) {
		if (isFunction(prop)) {
			store.raw[propName] = bind(store, prop)			
		}
	})
	each(storages, function(storage) {
		store._addStorage(storage)
	})
	each(plugins, function(plugin) {
		store._addPlugin(plugin)
	})
	return store
}

},{"./util":10}],10:[function(require,module,exports){
(function (global){
var assign = make_assign()
var create = make_create()
var trim = make_trim()
var Global = (typeof window !== 'undefined' ? window : global)

module.exports = {
	assign: assign,
	create: create,
	trim: trim,
	bind: bind,
	slice: slice,
	each: each,
	map: map,
	pluck: pluck,
	isList: isList,
	isFunction: isFunction,
	isObject: isObject,
	Global: Global
}

function make_assign() {
	if (Object.assign) {
		return Object.assign
	} else {
		return function shimAssign(obj, props1, props2, etc) {
			for (var i = 1; i < arguments.length; i++) {
				each(Object(arguments[i]), function(val, key) {
					obj[key] = val
				})
			}			
			return obj
		}
	}
}

function make_create() {
	if (Object.create) {
		return function create(obj, assignProps1, assignProps2, etc) {
			var assignArgsList = slice(arguments, 1)
			return assign.apply(this, [Object.create(obj)].concat(assignArgsList))
		}
	} else {
		function F() {} // eslint-disable-line no-inner-declarations
		return function create(obj, assignProps1, assignProps2, etc) {
			var assignArgsList = slice(arguments, 1)
			F.prototype = obj
			return assign.apply(this, [new F()].concat(assignArgsList))
		}
	}
}

function make_trim() {
	if (String.prototype.trim) {
		return function trim(str) {
			return String.prototype.trim.call(str)
		}
	} else {
		return function trim(str) {
			return str.replace(/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g, '')
		}
	}
}

function bind(obj, fn) {
	return function() {
		return fn.apply(obj, Array.prototype.slice.call(arguments, 0))
	}
}

function slice(arr, index) {
	return Array.prototype.slice.call(arr, index || 0)
}

function each(obj, fn) {
	pluck(obj, function(val, key) {
		fn(val, key)
		return false
	})
}

function map(obj, fn) {
	var res = (isList(obj) ? [] : {})
	pluck(obj, function(v, k) {
		res[k] = fn(v, k)
		return false
	})
	return res
}

function pluck(obj, fn) {
	if (isList(obj)) {
		for (var i=0; i<obj.length; i++) {
			if (fn(obj[i], i)) {
				return obj[i]
			}
		}
	} else {
		for (var key in obj) {
			if (obj.hasOwnProperty(key)) {
				if (fn(obj[key], key)) {
					return obj[key]
				}
			}
		}
	}
}

function isList(val) {
	return (val != null && typeof val != 'function' && typeof val.length == 'number')
}

function isFunction(val) {
	return val && {}.toString.call(val) === '[object Function]'
}

function isObject(val) {
	return val && {}.toString.call(val) === '[object Object]'
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],11:[function(require,module,exports){
module.exports = [
	// Listed in order of usage preference
	require('./localStorage'),
	require('./oldFF-globalStorage'),
	require('./oldIE-userDataStorage'),
	require('./cookieStorage'),
	require('./sessionStorage'),
	require('./memoryStorage')
]

},{"./cookieStorage":12,"./localStorage":13,"./memoryStorage":14,"./oldFF-globalStorage":15,"./oldIE-userDataStorage":16,"./sessionStorage":17}],12:[function(require,module,exports){
// cookieStorage is useful Safari private browser mode, where localStorage
// doesn't work but cookies do. This implementation is adopted from
// https://developer.mozilla.org/en-US/docs/Web/API/Storage/LocalStorage

var util = require('../src/util')
var Global = util.Global
var trim = util.trim

module.exports = {
	name: 'cookieStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var doc = Global.document

function read(key) {
	if (!key || !_has(key)) { return null }
	var regexpStr = "(?:^|.*;\\s*)" +
		escape(key).replace(/[\-\.\+\*]/g, "\\$&") +
		"\\s*\\=\\s*((?:[^;](?!;))*[^;]?).*"
	return unescape(doc.cookie.replace(new RegExp(regexpStr), "$1"))
}

function each(callback) {
	var cookies = doc.cookie.split(/; ?/g)
	for (var i = cookies.length - 1; i >= 0; i--) {
		if (!trim(cookies[i])) {
			continue
		}
		var kvp = cookies[i].split('=')
		var key = unescape(kvp[0])
		var val = unescape(kvp[1])
		callback(val, key)
	}
}

function write(key, data) {
	if(!key) { return }
	doc.cookie = escape(key) + "=" + escape(data) + "; expires=Tue, 19 Jan 2038 03:14:07 GMT; path=/"
}

function remove(key) {
	if (!key || !_has(key)) {
		return
	}
	doc.cookie = escape(key) + "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/"
}

function clearAll() {
	each(function(_, key) {
		remove(key)
	})
}

function _has(key) {
	return (new RegExp("(?:^|;\\s*)" + escape(key).replace(/[\-\.\+\*]/g, "\\$&") + "\\s*\\=")).test(doc.cookie)
}

},{"../src/util":10}],13:[function(require,module,exports){
var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'localStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

function localStorage() {
	return Global.localStorage
}

function read(key) {
	return localStorage().getItem(key)
}

function write(key, data) {
	return localStorage().setItem(key, data)
}

function each(fn) {
	for (var i = localStorage().length - 1; i >= 0; i--) {
		var key = localStorage().key(i)
		fn(read(key), key)
	}
}

function remove(key) {
	return localStorage().removeItem(key)
}

function clearAll() {
	return localStorage().clear()
}

},{"../src/util":10}],14:[function(require,module,exports){
// memoryStorage is a useful last fallback to ensure that the store
// is functions (meaning store.get(), store.set(), etc will all function).
// However, stored values will not persist when the browser navigates to
// a new page or reloads the current page.

module.exports = {
	name: 'memoryStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var memoryStorage = {}

function read(key) {
	return memoryStorage[key]
}

function write(key, data) {
	memoryStorage[key] = data
}

function each(callback) {
	for (var key in memoryStorage) {
		if (memoryStorage.hasOwnProperty(key)) {
			callback(memoryStorage[key], key)
		}
	}
}

function remove(key) {
	delete memoryStorage[key]
}

function clearAll(key) {
	memoryStorage = {}
}

},{}],15:[function(require,module,exports){
// oldFF-globalStorage provides storage for Firefox
// versions 6 and 7, where no localStorage, etc
// is available.

var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'oldFF-globalStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var globalStorage = Global.globalStorage

function read(key) {
	return globalStorage[key]
}

function write(key, data) {
	globalStorage[key] = data
}

function each(fn) {
	for (var i = globalStorage.length - 1; i >= 0; i--) {
		var key = globalStorage.key(i)
		fn(globalStorage[key], key)
	}
}

function remove(key) {
	return globalStorage.removeItem(key)
}

function clearAll() {
	each(function(key, _) {
		delete globalStorage[key]
	})
}

},{"../src/util":10}],16:[function(require,module,exports){
// oldIE-userDataStorage provides storage for Internet Explorer
// versions 6 and 7, where no localStorage, sessionStorage, etc
// is available.

var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'oldIE-userDataStorage',
	write: write,
	read: read,
	each: each,
	remove: remove,
	clearAll: clearAll,
}

var storageName = 'storejs'
var doc = Global.document
var _withStorageEl = _makeIEStorageElFunction()
var disable = (Global.navigator ? Global.navigator.userAgent : '').match(/ (MSIE 8|MSIE 9|MSIE 10)\./) // MSIE 9.x, MSIE 10.x

function write(unfixedKey, data) {
	if (disable) { return }
	var fixedKey = fixKey(unfixedKey)
	_withStorageEl(function(storageEl) {
		storageEl.setAttribute(fixedKey, data)
		storageEl.save(storageName)
	})
}

function read(unfixedKey) {
	if (disable) { return }
	var fixedKey = fixKey(unfixedKey)
	var res = null
	_withStorageEl(function(storageEl) {
		res = storageEl.getAttribute(fixedKey)
	})
	return res
}

function each(callback) {
	_withStorageEl(function(storageEl) {
		var attributes = storageEl.XMLDocument.documentElement.attributes
		for (var i=attributes.length-1; i>=0; i--) {
			var attr = attributes[i]
			callback(storageEl.getAttribute(attr.name), attr.name)
		}
	})
}

function remove(unfixedKey) {
	var fixedKey = fixKey(unfixedKey)
	_withStorageEl(function(storageEl) {
		storageEl.removeAttribute(fixedKey)
		storageEl.save(storageName)
	})
}

function clearAll() {
	_withStorageEl(function(storageEl) {
		var attributes = storageEl.XMLDocument.documentElement.attributes
		storageEl.load(storageName)
		for (var i=attributes.length-1; i>=0; i--) {
			storageEl.removeAttribute(attributes[i].name)
		}
		storageEl.save(storageName)
	})
}

// Helpers
//////////

// In IE7, keys cannot start with a digit or contain certain chars.
// See https://github.com/marcuswestin/store.js/issues/40
// See https://github.com/marcuswestin/store.js/issues/83
var forbiddenCharsRegex = new RegExp("[!\"#$%&'()*+,/\\\\:;<=>?@[\\]^`{|}~]", "g")
function fixKey(key) {
	return key.replace(/^\d/, '___$&').replace(forbiddenCharsRegex, '___')
}

function _makeIEStorageElFunction() {
	if (!doc || !doc.documentElement || !doc.documentElement.addBehavior) {
		return null
	}
	var scriptTag = 'script',
		storageOwner,
		storageContainer,
		storageEl

	// Since #userData storage applies only to specific paths, we need to
	// somehow link our data to a specific path.  We choose /favicon.ico
	// as a pretty safe option, since all browsers already make a request to
	// this URL anyway and being a 404 will not hurt us here.  We wrap an
	// iframe pointing to the favicon in an ActiveXObject(htmlfile) object
	// (see: http://msdn.microsoft.com/en-us/library/aa752574(v=VS.85).aspx)
	// since the iframe access rules appear to allow direct access and
	// manipulation of the document element, even for a 404 page.  This
	// document can be used instead of the current document (which would
	// have been limited to the current path) to perform #userData storage.
	try {
		/* global ActiveXObject */
		storageContainer = new ActiveXObject('htmlfile')
		storageContainer.open()
		storageContainer.write('<'+scriptTag+'>document.w=window</'+scriptTag+'><iframe src="/favicon.ico"></iframe>')
		storageContainer.close()
		storageOwner = storageContainer.w.frames[0].document
		storageEl = storageOwner.createElement('div')
	} catch(e) {
		// somehow ActiveXObject instantiation failed (perhaps some special
		// security settings or otherwse), fall back to per-path storage
		storageEl = doc.createElement('div')
		storageOwner = doc.body
	}

	return function(storeFunction) {
		var args = [].slice.call(arguments, 0)
		args.unshift(storageEl)
		// See http://msdn.microsoft.com/en-us/library/ms531081(v=VS.85).aspx
		// and http://msdn.microsoft.com/en-us/library/ms531424(v=VS.85).aspx
		storageOwner.appendChild(storageEl)
		storageEl.addBehavior('#default#userData')
		storageEl.load(storageName)
		storeFunction.apply(this, args)
		storageOwner.removeChild(storageEl)
		return
	}
}

},{"../src/util":10}],17:[function(require,module,exports){
var util = require('../src/util')
var Global = util.Global

module.exports = {
	name: 'sessionStorage',
	read: read,
	write: write,
	each: each,
	remove: remove,
	clearAll: clearAll
}

function sessionStorage() {
	return Global.sessionStorage
}

function read(key) {
	return sessionStorage().getItem(key)
}

function write(key, data) {
	return sessionStorage().setItem(key, data)
}

function each(fn) {
	for (var i = sessionStorage().length - 1; i >= 0; i--) {
		var key = sessionStorage().key(i)
		fn(read(key), key)
	}
}

function remove(key) {
	return sessionStorage().removeItem(key)
}

function clearAll() {
	return sessionStorage().clear()
}

},{"../src/util":10}],18:[function(require,module,exports){
module.exports = extend

var hasOwnProperty = Object.prototype.hasOwnProperty;

function extend() {
    var target = {}

    for (var i = 0; i < arguments.length; i++) {
        var source = arguments[i]

        for (var key in source) {
            if (hasOwnProperty.call(source, key)) {
                target[key] = source[key]
            }
        }
    }

    return target
}

},{}],19:[function(require,module,exports){
(function (global){
const OsmRequest = require('osm-request');
const osmAuth = require('osm-auth');

const osm = new OsmRequest({
  endpoint: 'https://www.openstreetmap.org',
  oauthConsumerKey: 'ZgM987arjTsqx9SH8jknXREO12x5dcgNpTt66EjK',
  oauthSecret: 'ZV29qzTCGZ2vd5GMEVDyVRz6yK1C4vyrzc0z7FUy',
  oauthUserToken: 'sghksxC7dDAra207oXGY4WIJX6ddXZrvixnrlzjL',
//  oauthUserTokenSecret: 'yvt9PMGgv8dGDPKw2s6ReHjBbBBkfUHBgEOmPus9',
});


global.sendOsmData = async function () {
  let element = await osm.fetchElement('way/39169225');
  element = osm.setProperty(element, 'key', 'value');
  element = osm.setProperties(element, {
    key1: 'value1',
    key2: 'value2',
    key3: 'value3',
  });
  element = osm.removeProperty(element, 'key2');
  element = osm.setTimestampToNow(element);

  const changesetId = await osm.createChangeset('Created by me', 'Test comment');
  //const isChangesetStillOpen = await osm.isChangesetStillOpen(changesetId);
  const newElementVersion = await osm.sendElement(element, changesetId);
  //element = osm.setVersion(element, newElementVersion);
}

global.sendOsmData1 = async function () {
  let element = await osm.fetchElement('way/39169225');
  element = osm.setProperty(element, 'key', 'value');
  element = osm.setProperties(element, {
    key1: 'value1',
    key2: 'value2',
    key3: 'value3',
  });
  element = osm.removeProperty(element, 'key2');
  element = osm.setTimestampToNow(element);


  const changesetId = await osm.createChangeset('Created by me', 'Test comment');
  const isChangesetStillOpen = await osm.isChangesetStillOpen(changesetId);
  const newElementVersion = await osm.sendElement(element, changesetId);
  //element = osm.setVersion(element, newElementVersion);
}


//sendOsmData1();

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"osm-auth":3,"osm-request":4}]},{},[19]);
