/**
 * Centralized list of supported barcode types for the template designer
 * Used by both BarcodeRenderer and PropertyPanel components
 */

// Complete mapping of barcode types compatible with JsBarcode
export const BARCODE_FORMATS = {
    auspost: "auspost",                                    // AusPost 4 State Customer Code
    azreccode: "azreccode",                                  // Aztec Code
    azteccodecompact: "azteccodecompact",                           // Compact Aztec Code
    aztecrune: "aztecrune",                                  // Aztec Runes
    bc412: "bc412",                                      // BC412
    channelcode: "channelcode",                                // Channel Code
    codablockf: "codablockf",                                 // Codablock F
    code11: "code11",                                     // Code 11
    code128: "code128",                                    // Code 128
    code16k: "code16k",                                    // Code 16K
    code2of5: "code2of5",                                   // Code 25
    code32: "code32",                                     // Italian Pharmacode
    code39: "code39",                                     // Code 39
    code39ext: "code39ext",                                  // Code 39 Extended
    code49: "code49",                                     // Code 49
    code93: "code93",                                     // Code 93
    code93ext: "code93ext",                                  // Code 93 Extended
    codeone: "codeone",                                    // Code One
    coop2of5: "coop2of5",                                   // COOP 2 of 5
    daft: "daft",                                       // Custom 4 state symbology
    databarexpanded: "databarexpanded",                            // GS1 DataBar Expanded
    databarexpandedcomposite: "databarexpandedcomposite",                   // GS1 DataBar Expanded Composite
    databarexpandedstacked: "databarexpandedstacked",                     // GS1 DataBar Expanded Stacked
    databarexpandedstackedcomposite: "databarexpandedstackedcomposite",            // GS1 DataBar Expanded Stacked Composite
    databarlimited: "databarlimited",                             // GS1 DataBar Limited
    databarlimitedcomposite: "databarlimitedcomposite",                    // GS1 DataBar Limited Composite
    databaromni: "databaromni",                                // GS1 DataBar Omnidirectional
    databaromnicomposite: "databaromnicomposite",                       // GS1 DataBar Omnidirectional Composite
    databarstacked: "databarstacked",                             // GS1 DataBar Stacked
    databarstackedcomposite: "databarstackedcomposite",                    // GS1 DataBar Stacked Composite
    databarstackedomni: "databarstackedomni",                         // GS1 DataBar Stacked Omnidirectional
    databarstackedomnicomposite: "databarstackedomnicomposite",                // GS1 DataBar Stacked Omnidirectional Composite
    databartruncated: "databartruncated",                           // GS1 DataBar Truncated
    databartruncatedcomposite: "databartruncatedcomposite",                  // GS1 DataBar Truncated Composite
    datalogic2of5: "datalogic2of5",                              // Datalogic 2 of 5
    datamatrix: "datamatrix",                                 // Data Matrix
    datamatrixrectangular: "datamatrixrectangular",                      // Data Matrix Rectangular
    datamatrixrectangularextension: "datamatrixrectangularextension",             // Data Matrix Rectangular Extension
    dotcode: "dotcode",                                    // DotCode
    ean13: "ean13",                                      // EAN-13
    ean13composite: "ean13composite",                             // EAN-13 Composite
    ean14: "ean14",                                      // EAN-14
    ean2: "ean2",                                       // EAN-2 (2 digit addon)
    ean5: "ean5",                                       // EAN-5 (5 digit addon)
    ean8: "ean8",                                       // EAN-8
    ean8composite: "ean8composite",                     // EAN-8 Composite
    flattermarken: "flattermarken",                     // Flattermarken
    gs1_128: "gs1-128",                                 // GS1-128
    gs1_128composite: "gs1-128composite",               // GS1-128 Composite
    gs1_cc: "gs1-cc",                                   // GS1 Composite 2D Component
    gs1datamatrix: "gs1datamatrix",                     // GS1 Data Matrix
    gs1datamatrixrectangular: "gs1datamatrixrectangular", // GS1 Data Matrix Rectangular
    gs1dldatamatrix: "gs1dldatamatrix",                 // GS1 Digital Link Data Matrix
    gs1dlqrcode: "gs1dlqrcode",                         // GS1 Digital Link QR Code
    gs1dotcode: "gs1dotcode",                                 // GS1 DotCode
    gs1northamericancoupon: "gs1northamericancoupon",                     // GS1 North American Coupon
    gs1qrcode: "gs1qrcode",                                  // GS1 QR Code
    hanxin: "hanxin",                                     // Han Xin Code
    hibcazteccode: "hibcazteccode",                              // HIBC Aztec Code
    hibccodablockf: "hibccodablockf",                             // HIBC Codablock F
    hibccode128: "hibccode128",                                // HIBC Code 128
    hibccode39: "hibccode39",                                 // HIBC Code 39
    hibcdatamatrix: "hibcdatamatrix",                             // HIBC Data Matrix
    hibcdatamatrixrectangular: "hibcdatamatrixrectangular",                  // HIBC Data Matrix Rectangular
    hibcmicropdf417: "hibcmicropdf417",                            // HIBC MicroPDF417
    hibcpdf417: "hibcpdf417",                                 // HIBC PDF417
    hibcqrcode: "hibcqrcode",                                 // HIBC QR Code
    iata2of5: "iata2of5",                                   // IATA 2 of 5
    identcode: "identcode",                                  // Deutsche Post Identcode
    industrial2of5: "industrial2of5",                             // Industrial 2 of 5
    interleaved2of5: "interleaved2of5",                            // Interleaved 2 of 5 (ITF)
    isbn: "isbn",                                       // ISBN
    ismn: "ismn",                                       // ISMN
    issn: "issn",                                       // ISSN
    itf14: "itf14",                                      // ITF-14
    japanpost: "japanpost",                              // Japan Post 4 State Customer Code
    kix: "kix",                                          // Royal Dutch TPG Post KIX
    leitcode: "leitcode",                                // Deutsche Post Leitcode
    mailmark: "mailmark",                                // Royal Mail Mailmark
    mands: "mands",                                      // Marks & Spencer
    matrix2of5: "matrix2of5",                            // Matrix 2 of 5
    maxicode: "maxicode",                                // MaxiCode
    micropdf417: "micropdf417",                          // MicroPDF417
    microqrcode: "microqrcode",                          // Micro QR Code
    msi: "msi",                                        // MSI Modified Plessey
    onecode: "onecode",                                    // USPS Intelligent Mail
    pdf417: "pdf417",                                     // PDF417
    pdf417compact: "pdf417compact",                       // Compact PDF417
    pharmacode: "pharmacode",                             // Pharmaceutical Binary Code
    pharmacode2: "pharmacode2",                           // Two-track Pharmacode
    planet: "planet",                                     // USPS PLANET
    plessey: "plessey",                                   // Plessey UK
    posicode: "posicode",                                 // PosiCode
    postnet: "postnet",                                   // USPS POSTNET
    pzn: "pzn",                                           // Pharmazentralnummer (PZN)
    qrcode: "qrcode",                                     // QR Code
    rationalizedCodabar: "rationalizedCodabar",          // Codabar
    raw: "raw",                                           // Custom 1D symbology
    rectangularmicroqrcode: "rectangularmicroqrcode",   // Rectangular Micro QR Code
    royalmail: "royalmail",                               // Royal Mail 4 State Customer Code
    sscc18: "sscc18",                                     // SSCC-18
    swissqrcode: "swissqrcode",                           // Swiss QR Code
    symbol: "symbol",                                     // Miscellaneous symbols
    telepen: "telepen",                                   // Telepen
    telepennumeric: "telepennumeric",                     // Telepen Numeric
    ultracode: "ultracode",                               // Ultracode
    upca: "upca",                                        // UPC-A
    upcacomposite: "upcacomposite",                       // UPC-A Composite
    upce: "upce",                                        // UPC-E
    upcecomposite: "upcecomposite",                       // UPC-E Composite
};

// For sample content generation
export const getSampleBarcodeContent = (barcodeType) => {
  switch (barcodeType?.toLowerCase()) {
    case "ean8":
      return "1234567"; // 7 digits (8th is check digit)
    case "ean13":
      return "123456789012"; // 12 digits (13th is check digit)
    case "ean14":
      return "1234567890123"; // 13 digits (14th is check digit)
    case "upca":
      return "12345678901"; // 11 digits (12th is check digit)
    case "upc":
      return "12345678901"; // 11 digits (12th is check digit)
    case "code39":
      return "HELLO123";
    case "code128":
      return "1234567890";
    case "gs1":
      return "0101234567890128";
    case "gs1_128":
      return "0101234567890128";
    case "gtin":
      return "12345678901231";
    case "isbn":
      return "9781234567897";
    case "isbn10":
      return "123456789X";
    case "isbn13":
      return "9781234567897";
    case "issn":
      return "12345678";
    case "itf":
      return "1234567890";
    case "jan":
      return "123456789012";
    case "pzn":
      return "12345678";
    default:
      return "1234567890";
  }
};

export default BARCODE_FORMATS;
