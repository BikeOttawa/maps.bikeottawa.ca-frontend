
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

function editTag(id, name, value=''){
  const div = document.getElementById(id)
  const input = document.createElement("input");
  input.setAttribute('type', 'text')
  input.setAttribute('id', name)
  input.setAttribute('style', 'height:initial;padding:initial;width:120px;color:#333;')
  input.setAttribute('class', 'fill-lighten3 small')
  input.setAttribute('name', name)
  input.setAttribute('value', value)
  div.innerHTML=''
  div.appendChild(input);
  input.select()
  document.getElementById('icon-'+name).classList.add('hidden');
}


const g_TagsDefinitions = [ {tag:'name', name:'Name',hint:'',showEmpty:true, options:['editable']},        //[actual OSM tag, display name for tag in popup, tooltip, show empty tag]
                        {tag:'highway', name:'Type', hint:'',showEmpty:false, options:['text']},
                        {tag:'winter_service', name:'Snowplowing', hint:'Is pathway plowed in winter', showEmpty:true, options:['','yes','no']},
                        {tag:'footway', name:'Type', hint:'Footway type', showEmpty:false, options:['','sidewalk','crossing']},
                        {tag:'winter_service:quality', name:'Plow quality', hint:'Optional: how well is the path typically plowed', showEmpty:true, options:['','good','intermediate','bad']},
                        {tag:'width', name:'Width', hint:'Width in meters', showEmpty:true, options:['',0.5,1,1.5,2,2.5,3,4,5,10], suffix:' m'},
                        {tag:'surface', name:'Surface', hint:'Pathway/road surface', showEmpty:true, options:['','asphalt','concrete','ground','fine_gravel','gravel','paving_stones','grass','wood','sand']},
                        {tag:'smoothness', name:'Smoothness', hint:'How smooth is the surface in summer', showEmpty:true, options:['','excellent','good','intermediate','bad','horrible','impassable']},
                        {tag:'lit', name:'Lit', hint:'Is it lit', showEmpty:true, options:['','yes','no']},
                        {tag:'lanes', name:'Lanes', hint:'Total number of lanes', showEmpty:true, options:['text']},
                        {tag:'maxspeed', name:'Speed Limit', hint:'Speed limit on this street', showEmpty:true, options:['',10,15,20,30,40,50,60,70,80,90]},
                        {tag:'bicycle_parking', name:'Type', hint:'Bike parking type', showEmpty:true, options:['','bollard','rack','wall_loops','stands','shed','other']},
                        {tag:'covered', name:'Covered', hint:'Whether this place is covered or not', showEmpty:true, options:['','yes','no']},
                        {tag:'capacity', name:'Capacity', hint:'How many bikes can comfortably fit', showEmpty:true, options:['',1,2,3,4,5,6,7,8,9,10,15,20,30,40,50,100]},
                        {tag:'service:bicycle:repair', name:'Repair', hint:'Shop offers repairs', showEmpty:true, options:['','yes','no']},
                        {tag:'service:bicycle:pump', name:'Pump', hint:'Bicycle pump', showEmpty:true, options:['','yes','no']},
                        {tag:'service:bicycle:chain_tool', name:'Chain Tool', hint:'Bicycle chain tool', showEmpty:true, options:['','yes','no']},
                        {tag:'cuisine', name:'Cuisine', hint:'', showEmpty:true, options:['editable']},
                        {tag:'outdoor_seating', name:'Outdoor Seating', hint:'Place has outdoor chairs', showEmpty:true, options:['','yes','no']},
                        {tag:'phone', name:'Phone', hint:'', showEmpty:false, options:['text']},
                        {tag:'website', name:'Web', hint:'', showEmpty:false, options:['text']},
                        {tag:'takeaway', name:'Takeaway', hint:'Place offers takeaway', showEmpty:false, options:['','yes','no']},
                        {tag:'indoor', name:'Indoor', hint:'Is it located indoors', showEmpty:true, options:['','yes','no']},
                        {tag:'fuel', name:'Fuel', hint:'What kind of fuel can be used', showEmpty:true, options:['','charcoal','wood','electric']},
                        {tag:'bottle', name:'Bottling station', hint:'Bottles can be easily filled', showEmpty:true, options:['','yes','no']},
                        {tag:'seasonal', name:'Seasonal', hint:'Functions only during part of a year', showEmpty:true, options:['','yes','no','summer','winter']},
                        {tag:'fee', name:'Fee', hint:'Need to pay to use', showEmpty:true, options:['','yes','no']},
                        {tag:'backrest', name:'Backrest', hint:'Bench has a backrest', showEmpty:true, options:['','yes','no']},
                        {tag:'material', name:'Material', hint:'What it\'s made of', showEmpty:true, options:['','wood','metal','concrete','stone','plastic']},
                        {tag:'description', name:'Description', hint:'', showEmpty:false, options:['editable']},
                        {tag:'information', name:'Type', hint:'What kind of information', showEmpty:true, options:['map','board','guidepost']},
                        {tag:'fixme', name:'Other info', hint:'Describe in a few words if there is anything wrong with this feature', showEmpty:true, options:['edit']}
                      ];



displayOsmElementInfo = function (element, lngLat, showTags, changesetComment, title='', showGoogle=false) {
  return new Promise(function(resolve, reject) {
    function formSubmit(event){
      event.preventDefault();
      document.getElementById('result').innerHTML = 'Sending ...';

      const elements = document.getElementById("feedback").elements
      const tags = {};
      for(let el of elements){
        el.readOnly=true;
        if(el.name!='' && el.type!='hidden' && !el.hidden){
          tags[el.name]=el.value;
        }
      }

      modifyOsmElement(element, tags, changesetComment)
      .then(function(){
      document.getElementById('result').innerHTML = 'Your changes were submitted!';
        setTimeout(function(){pop.remove();} , 1500);
        resolve(tags)
      })
      .catch(function(e){
        document.getElementById('result').innerHTML = '<font color="red">Failed to submit changes</font>';
        reject(e)
      })

    }

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
          showGoogle = false; //google now requires api key. Disable for now.
          if(showGoogle){
            popup+='<li><div id="showGoogle"><a href="https://www.google.com/maps/@?api=1&map_action=pano&viewpoint='+lngLat.lat+','+lngLat.lng
            popup+='" target="_blank"><img class="enlarge-onhover" src="https://maps.googleapis.com/maps/api/streetview?size=640x400&fov=120&pitch=-30&key=AIzaSyDXbZYWFjz5Nr8N1c0OoTA_YFYCyV0V6Fs&location='+lngLat.lat+','+lngLat.lng+'"></a></div></li>'
          }
          else{
            popup+='<li><div id="showMapillary"></div></li>'
            showMapillaryImage(lngLat)
          }
        }
        else{
          // mapval
          const iframe = `<iframe
            src="https://www.mapillary.com/embed?image_key=${mapval}&style=photo"
            height="360"
            width="480"
            frameborder="0" class="enlarge-onhover">
          </iframe>`
          popup+=`<li><div id="showMapillary">${iframe}</div></li>`
        }

        if(title!=''){
          popup += `<strong>${title}</strong>`;
        }
        for(var key of g_TagsDefinitions){
          const t = tags.find(function(ele){return ele.attributes['k'].value==key.tag});
          const tag = t ? t.attributes["v"].value : '';
          if(key.showEmpty==false && tag=='') continue;
          if(showTags.length>0 && !showTags.includes(key.tag)) continue;
          if(!Array.isArray(key.options)) continue;

          popup += `<div id="${key.tag}-div" style="max-width:300px"><li style="white-space:nowrap;margin:4px 0 4px 0"><div class="tooltip">${key.name}:&nbsp;&nbsp;`;

          if(key.options[0] == 'text'){
            popup += `</div><div class="inline" id="text-${key.tag}"><strong>${tag}</strong></div>`;
          }
          else if(key.options[0] == 'editable'){
            popup += `</div><div class="inline" id="text-${key.tag}"><strong>${tag}</strong></div>`;
            popup+=`<div id='icon-${key.tag}' class='fill-lighten1 button space-left0 edit-icon' style='width:12px;height:12px;padding:0' onclick='editTag("text-${key.tag}", "${key.tag}", "${tag}");'></div>`
          }
          else if(key.options[0] == 'edit'){
            popup += `<span class="tooltiptext">${key.hint}</span></div><input type="text" class="fill-lighten3 small" style="height:initial;padding:initial;width:120px;color:#333;" id="${key.tag}" name="${key.tag}" value="${tag}">`
          }
          else{
            popup += `<span class="tooltiptext">${key.hint}</span></div><select class="fill-lighten3" id="${key.tag}" name="${key.tag}" >`;
            key.options.forEach(function(w){popup+=`<option value="${w}" ${tag==w?"selected":""}>${w}</option>`});
            popup += '</select>' + (key.suffix?key.suffix:'');
            if(key.tag=='bicycle_parking'){
              popup+="<div class='fill-darken1 button space-left1' style='width:20px;height:20px;padding:0' onclick=document.getElementById('bikeParkingHint').classList.remove('hidden');>?</div>"
            }
          }
          popup += '</li></div>\n';
        }

        popup+='</ul>';
        popup+='<input type="hidden" name="link" value="' + window.location.href + '">';
        popup+='<input type="hidden" name="osm_link" value="https://www.openstreetmap.org/' + element + '">';
        popup+='<p id="result"></p><div class="center"><input class="button short fill-darken3" type="submit" value="Submit"/></div></form></div>';
      } else {
        popup += 'Failed to request details from osm.org';
      }
      pop.setHTML(popup)
      document.getElementById('feedback').onsubmit=formSubmit;
      if(showTags.includes('winter_service:quality') && showTags.includes('winter_service')){
        document.querySelector("#winter_service").onchange = function (e) {
          document.getElementById("winter_service:quality-div").style.display = (document.querySelector("#winter_service").value == 'yes')?'block':'none';
        }
        document.getElementById("winter_service:quality-div").style.display = (document.querySelector("#winter_service").value == 'yes')?'block':'none';
      }

    }
    xhr.send()
  });
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
