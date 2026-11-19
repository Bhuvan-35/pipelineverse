const $=id=>document.getElementById(id);
let runs=[],selectedRun=null,jobs=[],selectedJob=null,scene,camera,renderer,raycaster,mouse,cityGroup,meshList=[],drag=false,lastX=0,lastY=0;
const colors={success:0x36d399,failure:0xfb7185,running:0xfbbf24,pending:0x718096};
function status(j){if(j.status==="in_progress")return"running";if(j.status==="queued"||j.status==="waiting")return"pending";if(j.conclusion==="success")return"success";if(["failure","timed_out","cancelled","action_required"].includes(j.conclusion))return"failure";return"pending"}
function esc(s){return String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function toast(s){$("toast").textContent=s;$("toast").classList.add("show");setTimeout(()=>$("toast").classList.remove("show"),3000)}
function initCity(){
 const host=$("city");if(!window.THREE){host.textContent="Three.js CDN did not load; check internet access.";return}
 scene=new THREE.Scene();scene.background=new THREE.Color(0x0b1525);scene.fog=new THREE.Fog(0x0b1525,17,42);
 camera=new THREE.PerspectiveCamera(42,host.clientWidth/host.clientHeight,.1,100);camera.position.set(10,10,13);camera.lookAt(0,0,0);
 renderer=new THREE.WebGLRenderer({antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.setSize(host.clientWidth,host.clientHeight);host.appendChild(renderer.domElement);
 scene.add(new THREE.HemisphereLight(0xc4e4ff,0x25334a,2));let light=new THREE.DirectionalLight(0xffffff,2);light.position.set(7,12,8);scene.add(light);
 cityGroup=new THREE.Group();scene.add(cityGroup);let floor=new THREE.Mesh(new THREE.PlaneGeometry(30,24),new THREE.MeshStandardMaterial({color:0x14243a}));floor.rotation.x=-Math.PI/2;floor.position.y=-.08;cityGroup.add(floor);
 let grid=new THREE.GridHelper(30,30,0x35516e,0x20364c);grid.position.y=-.06;cityGroup.add(grid);
 raycaster=new THREE.Raycaster();mouse=new THREE.Vector2();
 renderer.domElement.addEventListener("pointerdown",e=>{drag=true;lastX=e.clientX;lastY=e.clientY});
 window.addEventListener("pointerup",()=>drag=false);
 renderer.domElement.addEventListener("pointermove",e=>{if(drag){cityGroup.rotation.y+=(e.clientX-lastX)*.006;cityGroup.rotation.x+=(e.clientY-lastY)*.003;lastX=e.clientX;lastY=e.clientY}});
 renderer.domElement.addEventListener("wheel",e=>{camera.position.multiplyScalar(e.deltaY>0?1.06:.94);camera.position.clampLength(8,28)},{passive:true});
 renderer.domElement.addEventListener("click",pick);window.addEventListener("resize",resize);animate();
}
function resize(){if(!renderer)return;let h=$("city");camera.aspect=h.clientWidth/h.clientHeight;camera.updateProjectionMatrix();renderer.setSize(h.clientWidth,h.clientHeight)}
function animate(){requestAnimationFrame(animate);renderer.render(scene,camera)}
function makeLabel(text,state){
 let c=document.createElement("canvas"),x=c.getContext("2d");c.width=512;c.height=128;x.fillStyle="#0a1424";x.fillRect(0,0,512,128);x.strokeStyle="#66819c";x.strokeRect(2,2,508,124);x.textAlign="center";x.fillStyle="#eef6ff";x.font="bold 29px Arial";x.fillText(text.slice(0,25),256,48);x.fillStyle=state==="success"?"#36d399":state==="failure"?"#fb7185":state==="running"?"#fbbf24":"#9aabc0";x.font="23px Arial";x.fillText(state.toUpperCase(),256,90);
 let sp=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(c),transparent:true}));sp.scale.set(2.8,.7,1);return sp;
}
function drawCity(){
 if(!cityGroup)return;meshList.forEach(m=>{m.geometry.dispose();m.material.dispose()});cityGroup.children.slice(2).forEach(o=>cityGroup.remove(o));meshList=[];selectedJob=null;inspect(null);
 let n=jobs.length,cols=Math.min(4,Math.ceil(Math.sqrt(n))),rows=Math.ceil(n/cols);
 jobs.forEach((j,i)=>{let x=(i%cols-(cols-1)/2)*4,z=(Math.floor(i/cols)-(rows-1)/2)*4,s=status(j),height=1.5+(i%3)*.55,g=new THREE.Group();g.position.set(x,0,z);g.userData.job=j;
 let mat=new THREE.MeshStandardMaterial({color:colors[s],emissive:colors[s],emissiveIntensity:.12,metalness:.2,roughness:.4});
 let b=new THREE.Mesh(new THREE.BoxGeometry(1.65,height,1.65),mat);b.position.y=height/2;b.userData.job=j;g.add(b);meshList.push(b);
 let roof=new THREE.Mesh(new THREE.BoxGeometry(1.85,.16,1.85),new THREE.MeshStandardMaterial({color:0x8caac8}));roof.position.y=height+.08;g.add(roof);
 for(let w=0;w<3;w++)for(let h=0;h<Math.floor(height/.45);h++){let win=new THREE.Mesh(new THREE.BoxGeometry(.12,.13,.025),new THREE.MeshBasicMaterial({color:0xc4f4ff}));win.position.set(-.48+w*.48,.35+h*.4,.84);g.add(win)}
 let label=makeLabel(j.name,s);label.position.y=height+.55;g.add(label);cityGroup.add(g);
 });
}
function pick(e){let r=renderer.domElement.getBoundingClientRect();mouse.x=(e.clientX-r.left)/r.width*2-1;mouse.y=-((e.clientY-r.top)/r.height)*2+1;raycaster.setFromCamera(mouse,camera);let hits=raycaster.intersectObjects(meshList);if(hits.length)inspect(hits[0].object.userData.job)}
function inspect(j){
 selectedJob=j;if(!j){$("jobTitle").textContent="Select a building";$("jobDescription").textContent="Choose a job in the 3D city to view its details.";$("jobMeta").innerHTML="";$("analysis").textContent="Failure explanations and suggested fixes appear here when a failed job is selected.";$("analyzeBtn").disabled=true;$("jobLink").classList.add("hidden");return}
 $("jobTitle").textContent=j.name;$("jobDescription").textContent="Job status: "+status(j)+". Inspect its logs if it failed.";
 $("jobMeta").innerHTML=[["Status",j.status],["Conclusion",j.conclusion||"not completed"],["Job ID",j.id],["Steps",(j.steps||[]).length]].map(([a,b])=>`<div class="meta"><span>${esc(a)}</span><b>${esc(b)}</b></div>`).join("");
 $("analysis").textContent=status(j)==="failure"?"This job failed. Analyze its logs to get a likely cause and suggested fix.":"No failure detected for this job.";
 $("analyzeBtn").disabled=status(j)!=="failure";$("jobLink").href=j.html_url||"#";$("jobLink").classList.toggle("hidden",!j.html_url);
}
async function loadJobs(run){
 selectedRun=run;renderRuns();$("workflowLink").href=run.html_url||"#";
 try{let r=await fetch(`/api/jobs?run_id=${run.id}`),d=await r.json();if(!r.ok)throw Error(d.error);jobs=d.jobs||[];drawCity();$("successCount").textContent=jobs.filter(j=>status(j)==="success").length;$("failedCount").textContent=jobs.filter(j=>status(j)==="failure").length;$("runningCount").textContent=jobs.filter(j=>status(j)==="running").length;inspect(null)}
 catch(e){toast(e.message);inspect(null)}
}
function renderRuns(){
 $("runsList").innerHTML="";if(!runs.length){$("runsList").textContent="No workflow runs found.";return}
 runs.forEach(run=>{let b=document.createElement("button");b.className="run"+(selectedRun?.id===run.id?" active":"");b.innerHTML=`<span>${esc(run.name)}<small>#${run.run_number} · ${esc(run.branch||"branch")}</small></span><b>${esc(run.conclusion||run.status)}</b>`;b.onclick=()=>loadJobs(run);$("runsList").appendChild(b)})
}
async function refresh(){
 $("refreshBtn").disabled=true;$("refreshBtn").textContent="Refreshing…";
 try{let r=await fetch("/api/workflows"),d=await r.json();if(!r.ok)throw Error(d.error);runs=d.runs||[];$("totalRuns").textContent=d.total_count??runs.length;renderRuns();if(runs.length)await loadJobs(runs.find(x=>x.id===selectedRun?.id)||runs[0]);else{jobs=[];drawCity();$("successCount").textContent=$("failedCount").textContent=$("runningCount").textContent="0"}}
 catch(e){toast(e.message);$("runsList").textContent=e.message}
 finally{$("refreshBtn").disabled=false;$("refreshBtn").textContent="↻ Refresh pipeline"}
}
async function analyze(){
 if(!selectedJob)return;$("analyzeBtn").disabled=true;$("analyzeBtn").textContent="Analyzing…";
 try{let r=await fetch("/api/analyze",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({job_id:selectedJob.id})}),d=await r.json();if(!r.ok)throw Error(d.error);
 $("analysis").innerHTML=d.analysis.map(a=>`<div><strong>${esc(a.category)}</strong><p>${esc(a.cause)}</p><strong>Suggested fix</strong><p>${esc(a.solution)}</p></div>`).join("<hr>")+`<p>${esc(d.note)}</p>`;
 }catch(e){$("analysis").textContent=e.message;toast(e.message)}
 finally{$("analyzeBtn").disabled=false;$("analyzeBtn").textContent="Analyze selected job logs"}
}
$("refreshBtn").onclick=refresh;$("analyzeBtn").onclick=analyze;initCity();refresh();setInterval(refresh,30000);
