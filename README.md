Start up:  

- Login to the AWS Console, go to AppSync, and create an API  

Tests:  

- In Postman collection, for each request, update URL  
- In Postman collection, for each request, update header x-api-key  
- In Postman collection, for each request, update body GraphQL query  
- In Postman collection, for each request, update body GraphQL variables  
- Send requests  

Tear down:  

- Delete AppSync API  
- Delete DynamoDB table
