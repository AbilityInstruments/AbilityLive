
class SharedVariable{
	  
	    static async Write(name,value){

			if(typeof abilitySample !== "undefined")
			    return abilitySample.setSharedVar(name,value);
		    else{
			    let writeResult = SharedVariable.httpGet("/?var_name=" + name + "&var_oper=write&var_value=" + value, true);
			}
			
		   
		}
		
		static Read(name){

			if(typeof abilitySample !== "undefined")
			    return abilitySample.getSharedVar(name);
			else
			    return SharedVariable.httpGet("/?var_name=" + name + "&var_oper=read", false);
		}
	  
	    static httpGet(theUrl, Async)
        {
          var xmlHttp = new XMLHttpRequest();
          xmlHttp.open( "GET", theUrl, Async ); // false for synchronous request
          xmlHttp.send( null );
          return xmlHttp.responseText;
        }
	  
}