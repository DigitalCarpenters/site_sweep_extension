import AppKit
import CoreGraphics
let output = CommandLine.arguments[1]
for size in [16, 32, 48, 128] {
  let scale = 4
  let pixels = size * scale
  let rep = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: pixels, pixelsHigh: pixels, bitsPerSample: 8, samplesPerPixel: 4, hasAlpha: true, isPlanar: false, colorSpaceName: .deviceRGB, bytesPerRow: 0, bitsPerPixel: 0)!
  NSGraphicsContext.saveGraphicsState()
  let graphics = NSGraphicsContext(bitmapImageRep: rep)!
  NSGraphicsContext.current = graphics
  let c = graphics.cgContext
  c.scaleBy(x: CGFloat(pixels)/28, y: CGFloat(pixels)/28)
  c.translateBy(x: 0, y: 28); c.scaleBy(x: 1, y: -1)
  c.setFillColor(NSColor(srgbRed: 1, green: 156.0/255.0, blue: 17.0/255.0, alpha: 1).cgColor)
  c.addPath(CGPath(roundedRect: CGRect(x: 0, y: 0, width: 28, height: 28), cornerWidth: 7, cornerHeight: 7, transform: nil)); c.fillPath()
  // One bold silhouette, sized for a 16-pixel toolbar rather than fine line art.
  c.translateBy(x: 14, y: 14)
  c.rotate(by: .pi / 4)
  c.setFillColor(NSColor(srgbRed: 37.0/255.0, green: 28.0/255.0, blue: 54.0/255.0, alpha: 1).cgColor)
  c.addPath(CGPath(roundedRect: CGRect(x: -2.35, y: -11, width: 4.7, height: 12.5), cornerWidth: 2.35, cornerHeight: 2.35, transform: nil)); c.fillPath()
  c.move(to: CGPoint(x: -4, y: 0))
  c.addLine(to: CGPoint(x: 4, y: 0))
  c.addQuadCurve(to: CGPoint(x: 5.4, y: 1), control: CGPoint(x: 5, y: 0))
  c.addLine(to: CGPoint(x: 8, y: 8.4))
  c.addQuadCurve(to: CGPoint(x: 7, y: 10), control: CGPoint(x: 8.8, y: 10))
  c.addLine(to: CGPoint(x: -7, y: 10))
  c.addQuadCurve(to: CGPoint(x: -8, y: 8.4), control: CGPoint(x: -8.8, y: 10))
  c.addLine(to: CGPoint(x: -5.4, y: 1))
  c.addQuadCurve(to: CGPoint(x: -4, y: 0), control: CGPoint(x: -5, y: 0))
  c.closePath(); c.fillPath()
  // Two broad separations make the head read as broom bristles at tiny sizes.
  c.setFillColor(NSColor(srgbRed: 1, green: 156.0/255.0, blue: 17.0/255.0, alpha: 1).cgColor)
  for x in [-3.2, 1.4] {
    c.addPath(CGPath(roundedRect: CGRect(x: x, y: 6, width: 1.8, height: 6), cornerWidth: 0.9, cornerHeight: 0.9, transform: nil)); c.fillPath()
  }
  NSGraphicsContext.restoreGraphicsState()
  let large = NSImage(size: NSSize(width: pixels, height: pixels)); large.addRepresentation(rep)
  let small = NSBitmapImageRep(bitmapDataPlanes: nil, pixelsWide: size, pixelsHigh: size, bitsPerSample:8, samplesPerPixel:4, hasAlpha:true, isPlanar:false, colorSpaceName:.deviceRGB, bytesPerRow:0, bitsPerPixel:0)!
  NSGraphicsContext.saveGraphicsState(); let gc=NSGraphicsContext(bitmapImageRep:small)!; NSGraphicsContext.current=gc; gc.imageInterpolation = .high
  large.draw(in:NSRect(x:0,y:0,width:size,height:size), from:.zero, operation:.copy, fraction:1)
  NSGraphicsContext.restoreGraphicsState()
  try small.representation(using:.png, properties:[:])!.write(to:URL(fileURLWithPath:output+"/icon\(size).png"))
}
