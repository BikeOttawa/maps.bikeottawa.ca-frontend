
function addUpdatedDate(layerName){
  const request = new XMLHttpRequest()
  request.open('GET','https://api.mapbox.com/tilesets/v1/bikeottawa?access_token=sk.eyJ1IjoiYmlrZW90dGF3YSIsImEiOiJjamdyYTJmN2EwMmtoMzJwc3JxM2hoZ3ozIn0.YB1JNmncsPvktmgGU_zK8A')
  request.onload = function () {
    if (request.status >= 200 && request.status < 400) {
      const data = JSON.parse(request.responseText);
      if(data && data instanceof Array){
        const date = new Date(data.find(function(x){return x.id === layerName}).modified)
        document.getElementById('dateUpdated').innerHTML = date.toLocaleString();
      }
    }
  }
  request.send()
}

function parseUrl(url)  //workaround for edge that doesn't support URLSearchParams
{
    if (url == "") return {};
    const ret = {};
    for (var part of url)
    {
        const par=part.split('=', 2);
        if (par.length == 1)
            ret[par[0]] = "";
        else
            ret[par[0]] = decodeURIComponent(par[1].replace(/\+/g, " "));
    }
    return ret;
}

function displayOsmElementInfo(element, lngLat, showTags, changesetComment, title='') {
  const TagsDefinitions = [ ['name','Name','',false],        //[actual OSM tag, display name for tag in popup, tooltip, show empty tag]
                          ['highway','Type','',false],
                          ['winter_service', 'Snowplowing', 'Is pathway plowed in winter',true],
                          ['winter_service:quality', 'Plow quality', 'Optional: how well is the path typically plowed',true],
                          ['width', 'Width', 'Width in meters',true],
                          ['surface', 'Surface', 'Pathway/road surface',true],
                          ['smoothness', 'Smoothness', 'How smooth is the surface in summer',true],
                          ['lit', 'Lit', 'Is it lit',true],
                          ['lanes','Lanes','Total number of lanes',true],
                          ['maxspeed','Speed Limit','Speed limit on this street',true],
                          ['bicycle_parking','Type','Bike parking type',true],
                          ['covered','Covered','Whether bike parking is covered or not',true],
                          ['capacity','Capacity','How many bikes can comfortably fit',true],
                          ['service:bicycle:repair','Repair','Shop offers repairs',true],
                          ['service:bicycle:pump','Pump','Bicycle pump',true],
                          ['service:bicycle:chain_tool','Chain Tool','Bicycle chain tool',true],
                          ['outdoor_seating','Outdoor Seating','Place has outdoor chairs',true],
                          ['phone','Phone','',false],
                          ['website','Web','',false],
                          ['indoor', 'Indoor', 'Is it located indoors',true],
                          ['seasonal', 'Seasonal', 'Works only during warm months',true],
                          ['fee', 'Fee', 'Need to pay to use',true],
                          ['description','Description','',false],
                          ['fixme', 'Other info', 'Describe in a few words if there is anything wrong with this feature',true]
                        ];

  if(typeof element == 'undefined') return;
  const pop = new mapboxgl.Popup()
  .setLngLat(lngLat)
  .setHTML('Loading...')
  .addTo(map)
  .setMaxWidth('640px')
  const xhr = new XMLHttpRequest()
  xhr.open('GET','https://api.openstreetmap.org/api/0.6/'+element)
  xhr.onload = function () {
    var popup = '<h4><a href="https://www.openstreetmap.org/' + element + '" target="_blank">' + element + '</a></h4><hr>'
    if (xhr.status === 200) {
      const xmlDOM = new DOMParser().parseFromString(xhr.responseText, 'text/xml');
      const tags = Array.from(xmlDOM.getElementsByTagName("tag"));
      popup+='<div id="fform"><form id="feedback"><ul>'
      const mapkey = tags.find(function(ele){return ele.attributes['k'].value=='mapillary'});
      let mapval=''
      if(mapkey){
        mapval = mapkey ? mapkey.attributes["v"].value : '';
      }
      if(mapval==''){
        popup+='<li><div id="showMapillary"></div></li>'
        showMapillaryImage(lngLat)
      }
      else{
        popup+=`<li><div id="showMapillary"><a href="https://www.mapillary.com/app/?focus=photo&pKey=${mapval}" target="_blank"><img class="enlarge-onhover" src="https://d1cuyjsrcm0gby.cloudfront.net/${mapval}/thumb-640.jpg"></a></div></li>`
      }

      if(title!=''){
        popup += `<strong>${title}</strong>`;
      }
      for(var key of TagsDefinitions){
        const t = tags.find(function(ele){return ele.attributes['k'].value==key[0]});
        const tag = t ? t.attributes["v"].value : '';
        if(key[3]==false && tag=='') continue;
        if(showTags.length>0 && !showTags.includes(key[0])) continue;

        popup += `<div id="${key[0]}-div" style="max-width:200px"><li style="margin:4px 0 4px 0"><div class="tooltip">${key[1]}:&nbsp;&nbsp;`;
        if(key[0] == 'width'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" name="width" >`;
          ['',0.5,1,1.5,2,2.5,3,4,5,10].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`});
          popup += '</select> m';
        }
        else if(key[0] == 'surface'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" name="surface">`;
          ['','asphalt','concrete','ground','fine_gravel','gravel','paving_stones','grass','wood','sand'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'smoothness'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" name="smoothness">`;
          ['','excellent','good','intermediate','bad','horrible','impassable'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'maxspeed'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" name="maxspeed">`;
          ['','20','30','40','50','60','70','80','90'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'winter_service'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="winter_service" name="winter_service">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'winter_service:quality'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="winter_service:quality" name="winter_service:quality">`;
          ['','good','intermediate','bad'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'lit'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="lit" name="lit">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'capacity'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="capacity" name="capacity" >`;
          ['',1,2,3,4,5,6,8,10,20,30,50,100].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`});
          popup += '</select>';
        }
        else if(key[0] == 'bicycle_parking'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="bicycle_parking" name="bicycle_parking">`;
          ['','stands','rack','wall_loops','bollard','shed','other'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'covered'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="covered" name="covered">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'service:bicycle:pump'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="service:bicycle:pump" name="service:bicycle:pump">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'service:bicycle:chain_tool'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="service:bicycle:chain_tool" name="service:bicycle:chain_tool">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'service:bicycle:repair'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="service:bicycle:repair" name="service:bicycle:repair">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'outdoor_seating'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="outdoor_seating" name="outdoor_seating">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'website' && tag!=''){
          popup += `<span class="tooltiptext">${key[2]}</span></div><a href="${tag}">${tag}</a>`;
        }
        else if(key[0] == 'indoor'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="indoor" name="indoor">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'seasonal'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="seasonsl" name="seasonal">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'fee'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><select class="fill-lighten3" id="fee" name="fee">`;
          ['','yes','no'].forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`})
          popup += '</select>';
        }
        else if(key[0] == 'fixme'){
          popup += `<span class="tooltiptext">${key[2]}</span></div><input type="text" class="fill-lighten3 small"  style="height:initial;padding:initial" id="fixme" value="${tag}">`
        }
        else{
          if(tag!=''){
            popup += '</div><strong>'+tag+'</strong>';
          }
        }
        popup += '</li></div>\n';
      }

      popup+='</ul>';
      popup+='<input type="hidden" name="link" value="' + window.location.href + '">';
      popup+='<input type="hidden" name="osm_link" value="https://www.openstreetmap.org/' + element + '">';
      popup+='<p id="result"></p><div class="center"><input class="button short fill-darken3" type="submit" value="Submit" /></div></form></div>';
    } else {
      popup += 'Failed to request details from osm.org';
    }
    pop.setHTML(popup)
    if(showTags.includes('winter_service:quality') && showTags.includes('winter_service')){
      document.querySelector("#winter_service").onchange = function (e) {
        document.getElementById("winter_service:quality-div").style.display = (document.querySelector("#winter_service").value == 'yes')?'block':'none';
      }
      document.getElementById("winter_service:quality-div").style.display = (document.querySelector("#winter_service").value == 'yes')?'block':'none';
    }
    $("#feedback").submit(function(event){

      const $form = $(this);
  		const $inputs = $form.find("input, select, button, textarea");
  		$inputs.prop("disabled", true);
  		$('#result').text('Sending ...');

      const tags = {};
      $('select').each(function(index) {
        tags[$(this)[0].name]=$(this)[0].value;
      });
      tags['fixme']=$('#fixme')[0].value;

      submitOsmChangeset(element, tags, changesetComment)
      .then(function(){
        $('#result').html('Your changes were submitted!');
        setTimeout(function(){pop.remove();} , 1500);
      })
      .catch(function(){
        $('#result').html('<font color="red">Failed to submit changes</font>');
      })
      event.preventDefault();

  	});
  }
  xhr.send()
}



function showMapillaryImage(lngLat) {
  const xhr = new XMLHttpRequest()
  xhr.open('GET','https://a.mapillary.com/v3/images/?radius=15&per_page=1&client_id=TG1sUUxGQlBiYWx2V05NM0pQNUVMQTo2NTU3NTBiNTk1NzM1Y2U2&closeto='+lngLat.lng+','+lngLat.lat)
  xhr.onload = function () {
    if (xhr.status === 200) {
      const result = JSON.parse(xhr.responseText)
      if(!result.features || result.features.length==0){
        return
      }
      document.getElementById('showMapillary').innerHTML = '<a href="https://www.mapillary.com/app/?focus=photo&pKey='+result.features[0].properties.key+'" target="_blank"><img class="enlarge-onhover" src="https://d1cuyjsrcm0gby.cloudfront.net/'+result.features[0].properties.key+'/thumb-640.jpg"></a>'
    }
  }
  xhr.send()
}


function nominatimGeocoder(query){

  const params = { format: "json", q: query, limit: 5, viewbox:'-76.36384,45.51697,-74.92326,45.03379', bounded: 1};
  const urlParams = new URLSearchParams(Object.entries(params));

  return fetch("//nominatim.openstreetmap.org/search?" + urlParams).then(function(response) {
    if(response.ok) {
      return response.json();
    } else {
      return [];
    }
  }).then(function(json) {
    return json.map(function(place) {
      return {
        center: [place.lon, place.lat],
        geometry: {
            type: "Point",
            coordinates: [place.lon, place.lat]
        },
        place_name: place.display_name,
        properties: {},
        type: 'Feature'
      };
    });
  });
};

function getStats(Stats, prefix){
  const ret = {'unknown': Stats.total_meters};
  for(tag of Object.keys(Stats)){
    if(tag.indexOf(prefix+':')==0){
      const value = tag.replace(prefix+':','');
      ret[value] = (Stats[tag]/1000).toFixed(2);
      ret['unknown']-=Stats[tag];
    }
  }
  ret['unknown'] = (ret['unknown']/1000).toFixed(2);
  return ret;
}
