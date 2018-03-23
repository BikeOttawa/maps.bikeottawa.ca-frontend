// Call evaluateLTS with way object that looks like: {id:'id', tags:{'highway': 'residential', 'maxspeed':'40', 'lanes':'2'}}
// This will return an object {lts:2 message:'line 1\nline 2\n...\nlast line'}
// where message contains a list of the decisions made to determine the lts level of the specified way.

function evaluateLTS (way) {
  var bp = bikingPermitted(way)
  if (!bp.permitted) {
    return bp.result
  }
  var isp = isSeparatedPath(way)
  if (isp.isSeparatedPath) {
    return isp.result
  }
  var ibl = isBikeLane(way)
  if (ibl.isBikeLane) {
    return ibl.result
  }
  var imt = isMixedTraffic(way)
  if (imt.isMixedTraffic) {
    return imt.result
  }

  return { lts: 0, message: 'Error: This way does not match any of the analysis criteria.' }
}

function HasTag (way, tag) {
  return (typeof way.tags[tag] !== 'undefined')
}

function HasTagValue (way, tag, tagvalue) {
  var x = way.tags[tag]
  if (typeof x === 'undefined') return false
  return x === tagvalue
}

function TagStartsWith (way, tag) {
  for (var t in way.tags) {
    if (t.startsWith(tag)) return true
  }
  return false
}

function TagStartsWithValue (way, tag, tagvalue) {
  for (var t in way.tags) {
    if (t.startsWith(tag)) {
      if (way.tags[t] === tagvalue) return true
    }
  }
  return false
}

function getLanes (way) {
  var lanes
  var def = 2
  if (HasTag(way, 'lanes')) {
    var l = way.tags['lanes']
    if (l.indexOf(';') === -1) {
      lanes = parseInt(l)
      if (isNaN(lanes)) {
        return { 'lanes': def, message: 'Error: Unknown \'lanes\' tag: \'' + l + '\'. Assuming default of ' + def.toString() + '.' }
      } else {
        return { 'lanes': lanes, message: '' }
      }
    } else {
      var list = l.Split(';')
      var ltot = 0
      for (var s in list) {
        lanes = parseInt(s)
        if (isNaN(lanes)) {
          return { 'lanes': def, message: 'Error: Unknown \'lanes\' tag in split value: \'' + l + '\'. Assuming default of ' + def.toString() + '.' }
        } else {
          ltot += lanes
        }
      }
      return { 'lanes': ltot, message: 'Split \'lanes\' tag. Using total of all elements.' }
    }
  } else {
    return { 'lanes': def, message: 'No \'lanes\' tag: \'' + l + '\'. Assuming default of ' + def.toString() + '.' }
  }
}

function getMaxSpeed (way) {
  var result
  if (HasTag(way, 'maxspeed')) {
    var maxspeed = way.tags['maxspeed']
    if (maxspeed === 'national') {
      return { maxspeed: 40, message: 'Error: Unknown \'maxspeed\' tag value \'national\'. Assuming a value of \'40\'.' }
    } else {
      result = parseInt(maxspeed)
      if (isNaN(result)) {
        return { maxspeed: 50, message: 'Error: Unknown \'maxspeed\' tag value \'' + maxspeed + '\'. Assuming a value of \'40\'.' }
      } else {
        return { maxspeed: maxspeed, message: '' }
      }
    }
  } else {
    if (HasTagValue(way, 'highway', 'motorway')) {
      return { maxspeed: 100, message: 'No maxspeed tag. Using default value of 100 when highway=motorway.' }
    } else if (HasTagValue(way, 'highway', 'primary') || HasTagValue(way, 'highway', 'secondary')) {
      return { maxspeed: 80, message: 'No maxspeed tag. Using default value of 80 when highway=\'' + way.tags['highway'] + '\'.' }
    } else {
      return { maxspeed: 50, message: 'No maxspeed tag. Using default value of 50 when highway=\'' + way.tags['highway'] + '\'.' }
    }
  }
}

function parkingPresent (way) {
  if (HasTagValue(way, 'parking', 'yes')) {
    return { parking: true, message: '' }
  }
  if (TagStartsWith(way, 'parking:')) {
    for (var tag in way.tags) {
      if (tag.startsWith('parking:lane:')) {
        var v = way.tags[tag]
        if (v === 'parallel' || v === 'perpendicular' || v === 'diagonal' || v === 'yes' || v === 'marked') {
          return { parking: true, message: 'Found tag \'' + tag + '\'=\'' + v + '\'. Parking is present.' }
        }
      }
    }
  }
  return { parking: false, message: 'Parking is not present.' }
}

function hasSeparatingMedian (way) {
  return false
}

function bikeLaneBlockageLTS (way) {
  // FIXME: This should return 1 if rare or 3 if frequent. It may
  // only apply in commercial areas. See Mineta Documentation.
  // This is a placeholder until such time as we can model this component.
  return 1
}

function bikeAndParkingWidth (way) {
  // FIXME: This is the sum of bike and parking lane width. It includes
  // marked buffer and paved gutter. We currently can't count it so we
  // just assume the maximum to remove the effect from the calculation.
  // This is a placeholder until such time as we can model this component.
  return 99999.9
}

function bikingPermitted (way) {
  if (HasTag(way, 'highway') || HasTag(way, 'bicycle')) {
    if (HasTagValue(way, 'bicycle', 'no')) {
      return { permitted: false, result: { lts: 0, message: 'Cycling not permitted due to bicycle=\'no\' tag.' } }
    }
    if (HasTagValue(way, 'highway', 'motorway') || HasTagValue(way, 'highway', 'motorway_link')) {
      return { permitted: false, result: { lts: 0, message: 'Cycling not permitted due to highway=\'' + way.tags['highway'] + '\' tag.' } }
    }
    if (HasTagValue(way, 'footway', 'sidewalk')) {
      if (!HasTagValue(way, 'bicycle', 'yes')) {
        if (HasTagValue(way, 'highway', 'footway') || HasTagValue(way, 'highway', 'path')) {
          return { permitted: false, result: { lts: 0, message: 'Cycling not permitted. When footway=\'sidewalk\' is present, there must be a bicycle=\'yes\' when the highway is \'footway\' or \'path\'.' } }
        }
      }
    }
  } else {
    return { permitted: false, result: { lts: 0, message: 'Missing highway tag. The way is not a highway.' } }
  }

  return { permitted: true, message: '' }
}

function isSeparatedPath (way) {
  var analyze = false
  var message = ''
  if (HasTagValue(way, 'highway', 'path') || HasTagValue(way, 'highway', 'footway') || HasTagValue(way, 'highway', 'cycleway')) {
    analyze = true
    message = 'This way is a separated path because highway=\'' + way.tags['highway'] + '\'.'
  } else if (HasTagValue(way, 'highway', 'construction')) {
    if (HasTagValue(way, 'construction', 'path') || HasTagValue(way, 'construction', 'footway') || HasTagValue(way, 'construction', 'cycleway')) {
      analyze = true
      message = 'This way is a separated path because highway=\'' + way.tags['highway'] + '\' and construction=\'' + way.tags['construction'] + '\'.'
    }
  } else if (TagStartsWithValue(way, 'cycleway', 'track') || TagStartsWithValue(way, 'cycleway', 'opposite_track')) {
    // FIXME: This doesn't seem to be covered by the Ottawa OSM guide. E.g. Laurier.
    analyze = true
    message = 'This way is a separated path because there is a cycleway defined as \'track\' or \'opposite_track\'.'
  }
  if (analyze) {
    message += '\nSeparated Tracks are always LTS=1.'
    return { isSeparatedPath: true, result: { lts: 1, message: cleanMessage(message) } }
  }

  return { isSeparatedPath: false }
}

function bikeLaneAnalysisParkingPresent (way, message) {
  var lts = bikeLaneBlockageLTS(way)

  var isResidential = HasTagValue(way, 'highway', 'residential')
  var width = bikeAndParkingWidth(way)

  var gl = getLanes(way)
  var lanes = gl.lanes
  if (gl.message.length > 0) {
    message += '\n' + gl.message
  }

  var gm = getMaxSpeed(way)
  var maxspeed = gm.maxspeed
  if (gm.message.length > 0) {
    message += '\n' + gm.message
  }

  if (lanes >= 3) {
    if (lts < 3) {
      message += '\nIncreasing LTS to 3 because there are 3 or more lanes.'
      lts = 3
    }
  }

  if (width <= 4.1) {
    if (lts < 3) {
      message += '\nIncreasing LTS to 3 because the bike lane width is less than 4.1m.'
      lts = 3
    }
  } else if (width <= 4.25) {
    if (lts < 2) {
      message += '\nIncreasing LTS to 2 because the bike lane width is less than 4.25m.'
      lts = 2
    }
  } else if (width < 4.5 && (maxspeed < 40 || isResidential)) {
    if (lts < 1) {
      message += '\nIncreasing LTS to 1 because the bike lane width is less than 4.5m. maxspeed is less than 40 on a residential street.'
      lts = 1
    }
  }

  if (maxspeed <= 40) {
    if (lts < 1) {
      message += '\nIncreasing LTS to 1 because the maxspeed is up to 40 km/h.'
      lts = 1
    }
  } else if (maxspeed <= 50) {
    if (lts < 2) {
      message += '\nIncreasing LTS to 2 because the maxspeed is between 41-50 km/h.'
      lts = 2
    }
  } else if (maxspeed < 65) {
    if (lts < 3) {
      message += '\nIncreasing LTS to 3 because the maxspeed is between 51-55 km/h.'
      lts = 3
    }
  } else {
    if (lts < 4) {
      message += '\nIncreasing LTS to 4 because the maxspeed is over 55 km/h.'
      lts = 4
    }
  }

  return { lts: lts, message: message }
}

function bikeLaneAnalysisNoParking (way, message) {
  var lts = bikeLaneBlockageLTS(way)
  var width = bikeAndParkingWidth(way)

  var gl = getLanes(way)
  var lanes = gl.lanes
  if (gl.message.length > 0) {
    message += '\n' + gl.message
  }

  var gm = getMaxSpeed(way)
  var maxspeed = gm.maxspeed
  if (gm.message.length > 0) {
    message += '\n' + gm.message
  }

  if (lanes === 3 && hasSeparatingMedian(way)) {
    if (lts < 2) {
      message += '\nIncreasing LTS to 2 because there are 3 lanes with a separating median.'
      lts = 2
    }
  } else if (lanes >= 3) {
    if (lts < 3) {
      message += '\nIncreasing LTS to 3 because there are 3 or more lanes.'
      lts = 3
    }
  }

  if (width <= 1.7) {
    if (lts < 2) {
      message += '\nIncreasing LTS to 2 because the bike lane width is less than 1.7 metres.'
      lts = 2
    }
  }

  if (maxspeed > 50) {
    if (maxspeed < 65) {
      if (lts < 3) {
        message += '\nIncreasing LTS to 3 because the maxspeed is between 51-64 km/h.'
        lts = 3
      }
    } else {
      if (lts < 4) {
        message += '\nIncreasing LTS to 4 because the maxspeed is over 65 km/h.'
        lts = 4
      }
    }
  }

  return { lts: lts, message: cleanMessage(message) }
}

function cleanMessage (message) {
  if (message.startsWith('\n')) return message.substring(1)
  return message
}

function isBikeLane (way) {
  var result
  var analyze = false
  var message = ''
  if (TagStartsWithValue(way, 'cycleway', 'crossing') ||
    TagStartsWithValue(way, 'cycleway', 'lane') ||
    TagStartsWithValue(way, 'cycleway', 'left') ||
    TagStartsWithValue(way, 'cycleway', 'opposite') ||
    TagStartsWithValue(way, 'cycleway', 'opposite_lane') ||
    TagStartsWithValue(way, 'cycleway', 'right') ||
    TagStartsWithValue(way, 'cycleway', 'yes')
  ) {
    analyze = true
    for (var t in way.tags) {
      if (t.startsWith('cycleway')) {
        if (message.length > 0) message += '\n'
        message = 'Way is a bike lane because \'' + t + '\'=\'' + way.tags[t] + '\'.'
      }
    }
  }
  if (HasTagValue(way, 'shoulder:access:bicycle', 'yes')) {
    analyze = true
    message = 'Way is a bike lane because shoulder:access:bicycle=\'' + way.tags['shoulder:access:bicycle'] + '\'.'
  }
  if (analyze) {
    var pp = parkingPresent(way)
    if (pp.parking) {
      result = bikeLaneAnalysisParkingPresent(way, message)
      return { isBikeLane: true, result: result }
    } else {
      result = bikeLaneAnalysisNoParking(way, message)
      return { isBikeLane: true, result: result }
    }
  }

  return { isBikeLane: false }
}

function isMixedTraffic (way) {
  var lanes
  var message = ''

  var isResidential = HasTagValue(way, 'highway', 'residential')

  var gl = getLanes(way)
  lanes = gl.lanes
  if (gl.message.length > 0) {
    message += '\n' + gl.message
  }

  var gm = getMaxSpeed(way)
  var maxspeed = gm.maxspeed
  if (gm.message.length > 0) {
    message += '\n' + gm.message
  }

  if (maxspeed <= 40) {
    if (lanes <= 3) {
      message += '\nSetting LTS to 2 because maxspeed is up to 40 km/h and 3 or fewer lanes.'
      return { isMixedTraffic: true, result: { lts: 2, message: cleanMessage(message) } }
    } else if (lanes <= 5) {
      message += '\nSetting LTS to 3 because maxspeed is up to 40 km/h and 5 or fewer lanes.'
      return { isMixedTraffic: true, result: { lts: 3, message: cleanMessage(message) } }
    }
  } else if (maxspeed <= 50) {
    if (HasTagValue(way, 'service', 'parking_aisle') || HasTagValue(way, 'service', 'driveway')) {
      message += '\nSetting LTS to 2 because maxspeed is up to 50 km/h and service is \'parking_aisle\' or \'driveway\'.'
      return { isMixedTraffic: true, result: { lts: 2, message: cleanMessage(message) } }
    }
    if (lanes < 3 && isResidential) {
      message += '\nSetting LTS to 2 because maxspeed is up to 50 km/h and lanes are fewer than 3 and highway=\'residential\'.'
      return { isMixedTraffic: true, result: { lts: 2, message: cleanMessage(message) } }
    } else if (lanes <= 3) {
      message += '\nSetting LTS to 3 because maxspeed is up to 50 km/h and lanes are fewer than 3.'
      return { isMixedTraffic: true, result: { lts: 3, message: cleanMessage(message) } }
    }
  }
  message += '\nSetting LTS to 4 because maxspeed is greater than 50 km/h.'
  return { isMixedTraffic: true, result: { lts: 4, message: cleanMessage(message) } }
}

/*
function RunTest (lts, way) {
  var res = evaluateLTS(way)
  var message = res.message
  if (res.lts !== lts) {
    throw { message: 'Test ' + way.id + ' failed.'}
  }
}

RunTest(0, { id: '0a', tags: { 'lanes': '3', 'maxspeed': '40' } })
RunTest(0, { id: '0b', tags: { 'highway': 'residential', 'lanes': '3', 'maxspeed': '40', 'bicycle': 'no' } })
RunTest(0, { id: '0c', tags: { 'highway': 'motorway', 'lanes': '3', 'maxspeed': '40' } })
RunTest(0, { id: '0d', tags: { 'highway': 'motorway_link', 'lanes': '3', 'maxspeed': '40' } })
RunTest(0, { id: '0e', tags: { 'lanes': '3', 'maxspeed': '40', 'footway': 'sidewalk' } })
RunTest(0, { id: '0f', tags: { 'highway': 'footway', 'lanes': '2', 'maxspeed': '40', 'footway': 'sidewalk' } })
RunTest(1, { id: '1a', tags: { 'highway': 'footway', 'lanes': '2', 'maxspeed': '40', 'footway': 'sidewalk', 'bicycle': 'yes' } })
RunTest(1, { id: '1b', tags: { 'highway': 'path', 'lanes': '2', 'maxspeed': '40', 'footway': 'sidewalk', 'bicycle': 'yes' } })
RunTest(2, { id: '1c', tags: { 'highway': 'residential', 'lanes': '2', 'maxspeed': '40', 'footway': 'sidewalk', 'bicycle': 'yes' } })
RunTest(1, { id: 'sp1', tags: { 'highway': 'path', 'lanes': '2', 'maxspeed': '40' } })
RunTest(1, { id: 'sp2', tags: { 'highway': 'footway', 'lanes': '2', 'maxspeed': '40' } })
RunTest(1, { id: 'sp3', tags: { 'highway': 'cycleway', 'lanes': '2', 'maxspeed': '40' } })
RunTest(1, { id: 'sp4', tags: { 'highway': 'construction', 'construction': 'path' } })
RunTest(1, { id: 'sp5', tags: { 'highway': 'construction', 'construction': 'footway' } })
RunTest(1, { id: 'sp6', tags: { 'highway': 'construction', 'construction': 'cycleway' } })
RunTest(1, { id: 'sp7', tags: { 'highway': 'residential', 'cycleway': 'track', 'maxspeed': '40' } })
RunTest(1, { id: 'sp8', tags: { 'highway': 'residential', 'cycleway': 'opposite_track', 'maxspeed': '80' } })
RunTest(1, { id: 'b1', tags: { 'highway': 'primary', 'cycleway': 'crossing', 'maxspeed': '30', 'lanes': '1' } })
RunTest(1, { id: 'b2', tags: { 'highway': 'primary', 'cycleway': 'lane', 'maxspeed': '30', 'lanes': '1' } })
RunTest(1, { id: 'b3', tags: { 'highway': 'residential', 'cycleway': 'left', 'lanes': '2' } })
RunTest(3, { id: 'b4', tags: { 'highway': 'primary', 'cycleway': 'opposite', 'maxspeed': '60', 'lanes': '1' } })
RunTest(4, { id: 'b5', tags: { 'highway': 'primary', 'cycleway': 'opposite_lane', 'maxspeed': '80', 'lanes': '1' } })
RunTest(1, { id: 'b6', tags: { 'highway': 'primary', 'cycleway': 'right', 'maxspeed': '50', 'lanes': '2' } })
RunTest(1, { id: 'b7', tags: { 'highway': 'primary', 'cycleway': 'yes', 'maxspeed': '50', 'lanes': '2' } })
RunTest(1, { id: 'b8', tags: { 'highway': 'primary', 'shoulder:access:bicycle': 'yes', 'maxspeed': '50', 'lanes': '2' } })
RunTest(1, { id: 'b9', tags: { 'highway': 'primary', 'cycleway:left': 'crossing', 'maxspeed': '30', 'lanes': '1', 'parking': 'yes' } })
RunTest(1, { id: 'b10', tags: { 'highway': 'primary', 'cycleway:middle': 'lane', 'maxspeed': '30', 'lanes': '1', 'parking': 'yes' } })
RunTest(2, { id: 'b11', tags: { 'highway': 'residential', 'cycleway': 'left', 'lanes': '2', 'parking': 'yes' } })
RunTest(3, { id: 'b12', tags: { 'highway': 'primary', 'cycleway': 'opposite', 'maxspeed': '60', 'lanes': '1', 'parking': 'yes' } })
RunTest(4, { id: 'b13', tags: { 'highway': 'primary', 'cycleway': 'opposite_lane', 'maxspeed': '80', 'lanes': '1', 'parking': 'yes' } })
RunTest(1, { id: 'b14', tags: { 'highway': 'primary', 'cycleway': 'right', 'maxspeed': '40', 'lanes': '1', 'parking': 'yes' } })
RunTest(2, { id: 'b15', tags: { 'highway': 'primary', 'cycleway:both': 'yes', 'maxspeed': '41', 'lanes': '1', 'parking': 'yes' } })
RunTest(2, { id: 'b16', tags: { 'highway': 'primary', 'cycleway:both': 'yes', 'maxspeed': '50', 'lanes': '1', 'parking': 'yes' } })
RunTest(3, { id: 'b17', tags: { 'highway': 'primary', 'shoulder:access:bicycle': 'yes', 'maxspeed': '51', 'lanes': '1', 'parking': 'yes' } })
RunTest(3, { id: 'b18', tags: { 'highway': 'primary', 'shoulder:access:bicycle': 'yes', 'maxspeed': '55', 'lanes': '1', 'parking': 'yes' } })
RunTest(3, { id: 'b19', tags: { 'highway': 'primary', 'cycleway:both': 'yes', 'maxspeed': '56', 'lanes': '1', 'parking': 'yes' } })
RunTest(3, { id: 'b20', tags: { 'highway': 'primary', 'cycleway:both': 'yes', 'maxspeed': '64', 'lanes': '1', 'parking': 'yes' } })
RunTest(4, { id: 'b21', tags: { 'highway': 'primary', 'cycleway:both': 'yes', 'maxspeed': '65', 'lanes': '1', 'parking': 'yes' } })
RunTest(2, { id: 'm1', tags: { 'highway': 'residential', 'lanes': '2', 'maxspeed': '30' } })
RunTest(3, { id: 'm2', tags: { 'highway': 'residential', 'lanes': '4', 'maxspeed': '30' } })
RunTest(2, { id: 'm3', tags: { 'highway': 'residential', 'lanes': '2', 'maxspeed': '50', 'service': 'parking_aisle' } })
RunTest(2, { id: 'm4', tags: { 'highway': 'residential', 'lanes': '2', 'maxspeed': '50', 'service': 'driveway' } })
RunTest(2, { id: 'm5', tags: { 'highway': 'residential', 'lanes': '2', 'maxspeed': '30' } })
RunTest(2, { id: 'm6', tags: { 'highway': 'residential', 'lanes': '2' } })
RunTest(2, { id: 'm7', tags: { 'highway': 'secondary', 'lanes': '2', 'maxspeed': '30' } })
RunTest(4, { id: 'm8', tags: { 'highway': 'secondary', 'lanes': '2', 'maxspeed': '60' } })
RunTest(4, { id: 'm9', tags: { 'lanes': '2', 'highway': 'secondary', 'cycleway': 'lane' } })
RunTest(4, { id: 'm10', tags: { 'lanes': '2', 'highway': 'secondary', 'shoulder:access:bicycle': 'yes' } })
RunTest(4, { id: 'm11', tags: { 'highway': 'secondary', 'lanes': '2' } })
RunTest(4, { id: 'm12', tags: { 'highway': 'residential', 'maxspeed': '60' } })
*/
