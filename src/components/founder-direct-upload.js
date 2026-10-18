// Shared by the browser and focused transport tests. Never persist/log capability URLs.
export async function reconcileUploadAttempt(attempt,readAsset) {
  // A page of assets cannot prove absence. Only the exact protected read's 404
  // confirms Foundation removed an invalid upload; all other errors stay uncertain.
  if(!attempt?.id)return attempt;
  try{await readAsset(attempt.id);return attempt;}
  catch(error){if(error.status===404)return null;throw error;}
}

export async function sendSignedUpload(reservation,file,{fetchImpl=fetch}={}) {
  const upload=reservation?.upload,url=new URL(upload?.url);
  if(reservation.status!=='PENDING' || upload.method!=='PUT' || upload.capability_ttl_seconds!==7200
    || url.protocol!=='https:' || !url.hostname.endsWith('.supabase.co') || url.port || url.username || url.password || url.hash
    || !url.pathname.startsWith('/storage/v1/object/upload/sign/trial-assets/') || !url.pathname.includes(`/${reservation.id}/asset.`)
    || url.searchParams.size!==1 || !url.searchParams.get('token') || upload.headers?.['x-upsert']!=='false'
    || upload.headers?.['Content-Type']!==file.type || file.size<1 || file.size>upload.max_bytes)throw Error('Upload capability could not be confirmed.');
  const response=await fetchImpl(url.href,{method:'PUT',headers:{'Content-Type':file.type,'x-upsert':'false'},
    credentials:'omit',referrerPolicy:'no-referrer',cache:'no-store',redirect:'error',body:file,signal:AbortSignal.timeout(25000)});
  await response.body?.cancel();
  if(!response.ok)throw Error('Upload result is uncertain. Reload and inspect the reservation before retrying.');
}
