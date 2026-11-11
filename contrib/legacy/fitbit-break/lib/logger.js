const Logger = (serverURL) => {
    console.log(`serverURL: ${serverURL}`);

    return {
        logToDB: async (type, content) => {
            const result = await fetch(`${serverURL}/api/log?function_name=logToDB`, {
                method: "POST",
                headers: {
                  "Content-Type": "application/json",
                },
                body: JSON.stringify({
                  type: type,
                  content: content
                }),
              }).then((r) => {
                return r.json();
              });
          
              return result;
        }

        
    }
    
};
const logger = Logger(process.env.NEXTAUTH_URL);
//const logger = Logger("http://localhost:3000");
export default logger;
