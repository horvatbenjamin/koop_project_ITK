package shared.cooproject.itk.hu;

import org.apache.log4j.Logger;
import org.bson.types.ObjectId;
import org.jwebsocket.api.WebSocketConnector;
import org.jwebsocket.kit.WebSocketServerEvent;
import org.jwebsocket.listener.WebSocketServerTokenEvent;
import org.jwebsocket.server.TokenServer;
import org.jwebsocket.token.Token;
import org.jwebsocket.token.TokenFactory;

import server.cooproject.itk.hu.coopMessageListener;

import com.mongodb.BasicDBObject;
import com.mongodb.DB;
import com.mongodb.DBCollection;
import com.mongodb.DBCursor;
import com.mongodb.DBObject;
import com.mongodb.Mongo;
import java.util.*;
import java.util.Map.Entry;

public class messenger {
	DB _mongo;// A mongodb
	boolean _use_mongodb = false; // Hasznalunk-e mongodbt
	private static Logger log = Logger.getLogger(messenger.class.getName());
	private static TokenServer _tServer;
	private String _collection;// az a mongodb collection ahol az objectumaink
								// vannak
	private String _sender;
	private coopMessageListener _coopMessageListener;
	private boolean _authImplemented = false;

	/**
	 * Messenger constructor mongodb nelkul
	 * 
	 * @param tServer
	 *            A tokenserver
	 * @param sender
	 *            A sender neve (username)
	 */
	public messenger(TokenServer tServer, String sender) {
		this._tServer = tServer;
		this._sender = sender;
		this._use_mongodb = false;
		this._coopMessageListener = null;
	}

	/**
	 * Constructor Mongodb adatokkal
	 * 
	 * @param tServer
	 *            a Tokenserver
	 * @param sender
	 *            A sender neve (username)
	 * @param mongodbHost
	 *            Mongodb-t futtato host
	 * @param mongodbDB
	 *            Mongodb database name
	 * @param mongodbCollection
	 *            Mongodb collection name
	 * @param parent
	 *            A szulo messagelistener
	 */
	public messenger(TokenServer tServer, String sender, String mongodbHost,
			String mongodbDB, String mongodbCollection,
			coopMessageListener parent) {
		this._tServer = tServer;
		this._sender = sender;
		this._authImplemented = true;
		this._coopMessageListener = parent;
		/* Kapcsolodjunk a mongodb-hez */
		try {
			Mongo m = new Mongo(mongodbHost);
			_mongo = m.getDB(mongodbDB);// Itt mar leteznie kell! use
										// coproject
			log.info("Successfully connected to MongoDB server!");
			this._use_mongodb = true;
			this._collection = mongodbCollection;
		} catch (Exception e) {
			log.warn("Error while connectiong to mongoDB! Please check the server!");
			// A Mongo konstruktor valójában akkor sem dob exceptiont, ha nem
			// fut MongoDB a gépen,
			// csak akkor dob kivételt, ha ki akarunk nyerni adatot.
		}
	}

	/**
	 * Uzenet feldolgozasa
	 * 
	 * @param c
	 *            A kuldo connectora (pl aEvent.getConnector())
	 * @param aToken
	 *            A kuldott token
	 */
	public void processMessage(WebSocketConnector c, Token aToken) {
		if (handleAuth(c, aToken)) {
			log.debug("Auth ok"+c.toString()+" message:"+aToken);
			// Dolgozzuk fel a letezo fieldeket
			int cType = -1;
			if (aToken.getString("type") != null) {
				cType = Integer.parseInt(aToken.getString("type"));
				log.debug("Client sent type field as STRING:"+aToken);
			}
			if (aToken.getInteger("type") != null) {
				cType = aToken.getInteger("type");
				log.debug("Client sent type field as INT"+aToken);
			}
			String cSenderName = aToken.getString("sender");
			String cMessage = aToken.getString("message");
			// Loggoljuk
			log.info("New token received from " + cSenderName
					+ " and the message is " + cMessage);
			// dolgozzuk fel type alapjan
			switch (cType) {
			// loginEvent
			case 0:
				if(this._authImplemented)handleLogin(c, aToken);
				break;
			// ModidifyObject (NINCS WIKIN, csak emailben)
			case 1:
				handleModify(c, aToken);
				break;
			// MoveObject + mentes
			case 2:
				handleMoveWithSave(c, aToken);
				break;
			// Create Object!
			case 3:
				handleCreate(c, aToken);
				break;
			// MoveObject mentes nelkul!
			case 4:
				handleMoveWithoutSave(c, aToken);
				break;
			// Delete
			case 5:
				handleDelete(c,aToken);
				break;
			// Uj el. Broadcast+mongodb
			case 6:
				handleCreateEdge(c,aToken);
				break;
			case 7:
				handleDeleteEdge(c,aToken);
				break;
			// Egy chat message. Egyelore csak broadcastoljuk
			case 1000:
				handleChatMessage(c, aToken);
				break;
			// Nem jot kuldott, biztos elnezte. Hat adjuk a tudtara asszertiv
			// kommunikacioval
			default:
				handleUnknowTypeField(c, aToken);
				break;
			}
		}
	}

	/**
	 * User join eventnel kuldjunk ki uzenetet
	 * @param c Az uj user connectorja
	 * @param username
	 *            A csatlakozott user neve
	 */
	public void userJoined(WebSocketConnector c,String username) {
		Token dResponse = getMessageBone(1000);
		dResponse.setString("message", username + " joined");// chat message
		_tServer.broadcastToken(c,dResponse);
		dResponse = getMessageBone(1000);
		dResponse.setString("message", "Welcome "+username);// chat message
		_tServer.sendToken(c,dResponse);
	}

	/**
	 * Uzenet kuldese, ha egy user zarja a connectiont
	 * 
	 * @param username
	 *            A kilepo user neve
	 */
	public void userLeft(String username) {
		Token dResponse = getMessageBone(1000);
		dResponse.setString("message", username + " left the server");// chat
		_tServer.broadcastToken(dResponse); // message
	}

	/* Senderek */
	/**
	 * Create uzenetre valaszol
	 * @param c A connector, ahova ezt kuldjuk (pl aEvent.getConnector() )
	 * @param ObjectID a letrejott object IDja
	 * @param aToken az eredeti uzenete, amibol majd kinyerjuk az infokat
	 */
	public void sendCreateResponse(WebSocketConnector c, String ObjectID, Token aToken){
		log.debug("sendCreate" + c.toString());
		Token response = getMessageBone(4);
		String createdAt = aToken.getString("timestamp");
		@SuppressWarnings("unchecked")
		Map<String, String> message = aToken.getMap("message");
		message.put("createdAt", createdAt);
		message.put("savePos", "false");
		String objId = saveToken(aToken);
		message.put("objId", objId);
		response.setMap("message", message);
		_tServer.broadcastToken(response);
	}
	
	
	/**
	 * Kikuldi az osszes db-ben talalhato objectet az adott connectionre
	 * 
	 * @param c
	 *            A connector, pl aEvent.getConnector()
	 */
	public void sendAllObjects(WebSocketConnector c) {
		// Szerezzuk meg a collectiont
		DBCollection _c = _mongo.getCollection(this._collection);
		// legyen inkább az összes:

		BasicDBObject query_rectangles = new BasicDBObject();
		query_rectangles.put("data", new BasicDBObject("$ne", "EDGE"));

		BasicDBObject query_edges = new BasicDBObject();
		query_edges.put("data", "EDGE");

		DBCursor cur = _c.find(query_rectangles).sort(new BasicDBObject("_id", -1));
		// gyartsunk responsokat, es kuldjuk ki!
		log.info("Sending welcome packets");
		while (cur.hasNext()) {
			Token dResponse = getTokenFromMongoDBObject(cur.next());
			_tServer.sendToken(c, dResponse);
		}

		DBCursor cur_edges = _c.find(query_edges).sort(new BasicDBObject("_id", -1));
		while (cur_edges.hasNext()) {
			Token dResponse = getEdgeFromMongoDBObject(cur_edges.next());
			_tServer.sendToken(c, dResponse);
		}

	}

	/* Handlerek */
	private boolean handleAuth(WebSocketConnector c, Token aToken){
		log.debug("handleAuth " + c.toString() + " - " + aToken);
		if(this._authImplemented){
			return this._coopMessageListener.isLoggedIn(c,aToken);
		}else{
			// ha nincs implementalva auth!
			return true;
		}
	}
	
	private void handleCreateEdge(WebSocketConnector c, Token aToken){
		log.debug("handleCreateEdge " + c.toString() + " - " + aToken);
		this._tServer.broadcastToken(aToken);
		String objId = saveEdge(aToken);
	}

	private void handleDeleteEdge(WebSocketConnector c, Token aToken){
		log.debug("handleDeleteEdge " + c.toString() + " - " + aToken);
		if(deleteEdgeObject(aToken)){
			log.debug("Object successfully deleted:" + aToken);
			//broadcast original message
			this._tServer.broadcastToken(aToken);
		}else{
			log.debug("Error while deleting the object:" + aToken);
		}
	};

	/**
	 * Ismeretlen type field a jsonben valaszoljuk a feladonak.
	 * 
	 * @param c
	 *            A kuldo connectorja
	 * @param aToken
	 *            Maga a token
	 * @param cType
	 *            A hibasnak/ismeretlennek itelt type mezo tartalma
	 */
	private void handleUnknowTypeField(WebSocketConnector c, Token aToken) {
		int cType = 0;
		if (aToken.getString("type") != null) {
			cType = Integer.parseInt(aToken.getString("type"));
		}
		log.warn("Message with invalid type field " + cType);
		Token dResponse = getMessageBone(1000);
		dResponse.setString("message", "Ne haragudj, de elrontottad a type("
				+ cType + ") mezo erteket!");
		this._tServer.sendToken(c, dResponse);
	}

	/**
	 * Chat message kezelese
	 * 
	 * @param c
	 *            A kuldo connectorja
	 * @param aToken
	 *            A kuldott uzenet Token alakban
	 */
	private void handleChatMessage(WebSocketConnector c, Token aToken) {
		log.debug("handleChatMessage " + c.toString() + " - " + aToken);
		this._tServer.broadcastToken(c, aToken);// az elso parameter megmondja,
												// hogy kinek NE broadcastolja,
												// a masodik maga a Token
	}

	/**
	 * Az object move, mentes nelkul handlerje
	 * 
	 * @param c
	 *            A kuldo connectorja
	 * @param aToken
	 *            A kuldott uzenet
	 */
	private void handleMoveWithoutSave(WebSocketConnector c, Token aToken) {
		log.debug("handleMoveWithoutSave " + c.toString() + " - " + aToken);
		this._tServer.broadcastToken(c, aToken);// az elso parameter megmondja,
												// hogy kinek NE broadcastolja,
												// a masodik maga a Token
	}

	/**
	 * Move mentessel event handlerje
	 * 
	 * @param c
	 *            A kuldo connectorja
	 * @param aToken
	 *            A kuldott uzenet Token alakban
	 */
	private void handleMoveWithSave(WebSocketConnector c, Token aToken) {
		log.debug("handleMoveWithSave " + c.toString() + " - " + aToken);
		this.saveToken(aToken);
		this._tServer.broadcastToken(c, aToken);// az elso parameter megmondja,
												// hogy kinek NE broadcastolja,
												// a masodik maga a Token
	}

	/**
	 * Modify uzenet handlerje
	 * 
	 * @param c
	 *            A kuldo connectorja
	 * @param aToken
	 *            A kuldo uzenet Token alakban
	 */
	private void handleModify(WebSocketConnector c, Token aToken) {
		log.debug("handleModify " + c.toString() + " - " + aToken);
		this.saveToken(aToken);// Ha modosult, akkor mindenkeppen elmentjuk
		this._tServer.broadcastToken(c, aToken);// az elso parameter megmondja,
												// hogy kinek NE broadcastolja,
												// a masodik maga a Token
	}

	/**
	 * A create uzenet handlerje
	 * 
	 * @param c
	 *            A kuldo connectorja
	 * @param aToken
	 *            A kuldott uzenet
	 */
	private void handleCreate(WebSocketConnector c, Token aToken) {
		// Generaljuk valasz uzenetet, es kozben mentjuk az eredetit
		log.debug("handleCreate " + c.toString() + " - " + aToken);
		String objId = saveToken(aToken);
		this.sendCreateResponse(c,objId,aToken);
	}

	/**
	 * A login eventet kezeli le
	 * 
	 * @param c
	 *            A connector
	 * @param aToken
	 *            A token
	 */
	private void handleLogin(WebSocketConnector c, Token aToken) {
		log.debug("handleLogin " + c.toString() + " - " + aToken);
		String username = aToken.getString("sender");
		this._coopMessageListener.handleLogin(c, username);
		
	}
	/**
	 * Torlesi event kezelese
	 * @param c A connector
	 * @param aToken A token
	 */
	/* Hogy mukodik?
	 * A server var egy type = 5 uzenetet.
	 * Ha az objId letezik, es a torles alatt nem lep fel problema,
	 *  akkor a server MINDENKINEK broadcastolja az uzenetet. Igen, a kuldo
	 *  is megkapja, mivel vele is valahogy tudatni kell, hogy sikeres volt
	 *  a torles.
	 *  Amennyiben a fenti feltetelek kozul valami nem teljesul (null objID, nem tudja
	 *  betolteni az adatbazisbol, akkor nem kuldi tovabb az uzenetet)
	 */
	private void handleDelete(WebSocketConnector c, Token aToken){
		log.debug("handleDelete " + c.toString() + " - " + aToken);
		if(deleteObject(aToken)){
			log.debug("Object successfully deleted:" + aToken);
			//broadcast original message
			this._tServer.broadcastToken(aToken);
		}else{
			log.debug("Error while deleting the object:" + aToken);
		}
	}

	/* Kuldessel kapcsolatos dolgok */
	/**
	 * TODO: FIXME Kikuldjuk az aktualis user listet
	 * 
	 * @param aEvent
	 *            a csatlakozo event
	 */
	@SuppressWarnings("unchecked")
	public void sendUserList(WebSocketConnector c) {
		log.info("Sending out user list");
		Token usersMessage = TokenFactory.createToken();
		// Iterator<?> it = _users.entrySet().iterator();
		LinkedList<Token> userList = new LinkedList<Token>();
		/*
		 * while (it.hasNext()) { Map.Entry<String,String> pairs =
		 * (Entry<String, String>)it.next(); HashMap<String,String> u = new
		 * HashMap<String,String>(); Token userMessage = getMessageBone(1001);
		 * u.put("user",pairs.getValue()); userMessage.setMap("message",u);
		 * userList.add(userMessage); }
		 */
		System.out.println(userList.toString());
		usersMessage.setList("messages", userList);// mert emptystring nevu
													// array kicsit
													// odabaszna....
		_tServer.sendToken(c, usersMessage);
	}

	/* Private dolgok */
	/**
	 * Megcsinalja a szofisztikalt uzenetunk vazat
	 * 
	 * @param type
	 *            az uzenet tipusa
	 * @return TOKEN a default json uzenetformatum alapjan
	 */
	private Token getMessageBone(int type) {
		// A recept
		// Fogj 1 message-t
		Token simpleMessage = TokenFactory.createToken();
		// Rakj bele typeot
		simpleMessage.setInteger("type", type);
		// Sendert
		simpleMessage.setString("sender", this._sender);
		// Timestampet
		double timestamp = System.currentTimeMillis() / 1000;
		simpleMessage.setString("timestamp", Double.toString(timestamp));
		return simpleMessage;
	}

	/**
	 * Mongodb objectbol Token-t csinalunk. Ez is deprecated lesz, amint
	 * letisztul a json forgalom, es hasznalhatjuk a beepitett konvertert!
	 * 
	 * @param o
	 *            Mongodb object
	 * @return Token amiben a message van
	 */
	private Token getTokenFromMongoDBObject(DBObject o) {
		Token r = getMessageBone(2);
		/*
		 * Vegulis egyszerusitettem db schemat, mert rohadt szarul van
		 * implementalva javaban mongodb driver igy ahhoz hogy kiszedjek egy
		 * array elemet, ki kell szednem az arrayt mint list, vegigiteralni
		 * rajta, azokbol kiszedni egy basicBsonobjectet, majd azokban nezni
		 * hogy mi a kulcs, es az ertek
		 */
		// log.info("Mongodb row:"+o.toString());
		Map<String, String> message = new HashMap<String, String>();
		message.put("objId", o.get("_id").toString()); // a doksi szerint
														// objId-nek hívjuk az
														// üzenetben, de a DBben
														// az objectid-t
														// kezeljük.
		if (o.get("x") != null)
			message.put("x", o.get("x").toString());
		if (o.get("y") != null)
			message.put("y", o.get("y").toString());
		if (o.get("z") != null)
			message.put("z", o.get("z").toString());
		if (o.get("data") != null)
			message.put("data", o.get("data").toString());
		r.setMap("message", message);
		return r;

	}

	private Token getEdgeFromMongoDBObject(DBObject o) {
		Token r = getMessageBone(6);
		/*
		 * Vegulis egyszerusitettem db schemat, mert rohadt szarul van
		 * implementalva javaban mongodb driver igy ahhoz hogy kiszedjek egy
		 * array elemet, ki kell szednem az arrayt mint list, vegigiteralni
		 * rajta, azokbol kiszedni egy basicBsonobjectet, majd azokban nezni
		 * hogy mi a kulcs, es az ertek
		 */
		// log.info("Mongodb row:"+o.toString());
		Map<String, String> message = new HashMap<String, String>();
		message.put("objId", o.get("_id").toString()); // a doksi szerint
														// objId-nek hívjuk az
														// üzenetben, de a DBben
														// az objectid-t
														// kezeljük.
		if (o.get("data") != null)
			message.put("data", o.get("data").toString());
		if (o.get("Rectangle1Id") != null)
			message.put("Rectangle1Id", o.get("Rectangle1Id").toString());
		if (o.get("Rectangle2Id") != null)
			message.put("Rectangle2Id", o.get("Rectangle2Id").toString());
		r.setMap("message", message);
		return r;

	}

	/**
	 * Elmenti az aTokenben talalhato informaciokat az adatbazisba
	 * 
	 * @param _collection
	 *            a collection neve, ahova menteni akarunk
	 * @param aToken
	 *            a kapott token
	 * @return objectID
	 */
	private String saveToken(Token aToken) {
		DBCollection _c = _mongo.getCollection(this._collection);//
		Map message = aToken.getMap("message");
		log.info("Saving token message:" + message.toString());
		// Kesobb, ha letisztul az uzenetkuldes, hasznalhatjuk a JSON.parse
		// parancsot is, es akkor nem kell ennyit bohockodni :(
		// Nyerjuk ki a nekunk kello infokat
		String objId = "";
		if(message.get("objId") !=null){
			objId = message.get("objId").toString();
			log.debug("Found objID :"+objId);
		}
		

		BasicDBObject d = new BasicDBObject();
		d.put("x", (message.get("x") == null ? 0 : message.get("x").toString()));
		d.put("y", (message.get("y") == null ? 0 : message.get("y").toString()));
		d.put("z", (message.get("z") == null ? 0 : message.get("z").toString()));
		// data
		if (message.get("data") != null) {
			d.put("data", message.get("data").toString());
		}
		// Nem biztos, hogy mongo dob exception, de azert hatha
		try {
			// létezik-e már az adott id-jű dokumentum?
			DBObject doc = null;
			if(!objId.isEmpty()){
				doc = _c.findOne(new BasicDBObject("_id", new ObjectId(
					objId)));
			}
			if (doc != null && !objId.isEmpty()) {
				log.debug("Object found, it's an update!");
				_c.update(doc, new BasicDBObject().append("$set", d));
				log.debug("Old object successfully updated: " + d.toString());
				return ((ObjectId) doc.get("_id")).toString();
			} else {
				log.debug("Object not found, it's a create!");
				_c.insert(d);
				log.debug("New object successfully inserted: " + d.toString());
				return ((ObjectId) d.get("_id")).toString();
			}
		} catch (Exception e) {
			log.warn("Error while saving aToken: " + d.toString() + " Error:"
					+ e.getMessage());
			return null;
		}
	}

	private String saveEdge(Token aToken){
		DBCollection _c = _mongo.getCollection(this._collection);
		Map message = aToken.getMap("message");
		log.info("Saving token message:" + message.toString());
		String objId = "";
		BasicDBObject d = new BasicDBObject();
		d.put("data", "EDGE");
		d.put("Rectangle1Id", message.get("Rectangle1Id").toString() );
		d.put("Rectangle2Id", message.get("Rectangle2Id").toString() );
		_c.insert(d);
		log.debug("New EDGE successfully inserted: " + d.toString());
		return d.get("_id").toString();
	};
	
	private boolean deleteObject(Token aToken){
		DBCollection _c = _mongo.getCollection(this._collection);//
		Map message = aToken.getMap("message");
		log.info("Delete token message:" + message.toString());
		// Kesobb, ha letisztul az uzenetkuldes, hasznalhatjuk a JSON.parse
		// parancsot is, es akkor nem kell ennyit bohockodni :(
		// Nyerjuk ki a nekunk kello infokat
		String objId = "";
		if(message.get("objId") !=null){
			objId = message.get("objId").toString();
			log.debug("objID found :"+objId);
		}else{
			log.debug("objID not found!");
			return false;
		}
		try {
			// Betoltjuk az adatbazisbol
			DBObject doc = _c.findOne(new BasicDBObject("_id", new ObjectId(objId)));
			
			if (doc != null ) {
				log.debug("Object found, let's remove it!");
				_c.remove(doc);
				log.debug("Object removed");
				return true;
			} else {
				log.debug("Object not found!");
				return false;
			}
		} catch (Exception e) {
			log.warn("Error while deleting aToken: " + objId.toString() + " Error:"
					+ e.getMessage());
			return false;
		}
	}

	private boolean deleteEdgeObject(Token aToken){
		DBCollection _c = _mongo.getCollection(this._collection);//
		Map message = aToken.getMap("message");
		log.info("Delete EDGEtoken message:" + message.toString());

		try {
			// Betoltjuk az adatbazisbol
			BasicDBObject query1 = new BasicDBObject();
			query1.put("Rectangle1Id", message.get("Rectangle1Id").toString());
			query1.put("Rectangle2Id", message.get("Rectangle2Id").toString());

			DBObject doc = _c.findOne(query1);
			
			
			if (doc != null ) {
				log.debug("Object found, let's remove it!");
				_c.remove(doc);
				log.debug("Object removed");
				return true;
			}

		}catch (Exception e){
			log.warn("Retrying....");
		};

		try{
			BasicDBObject query2 = new BasicDBObject();
			query2.put("Rectangle1Id", message.get("Rectangle2Id").toString());
			query2.put("Rectangle2Id", message.get("Rectangle1Id").toString());

			DBObject doc2 = _c.findOne(query2);

			if (doc2 != null ) {
				log.debug("Object found, let's remove it!");
				_c.remove(doc2);
				log.debug("Object removed");
				return true;
			}
			log.debug("Object not found!");
		} catch (Exception e) {
			log.warn("Error while deleting EDGE  Error:"
					+ e.getMessage());
			return false;
		}
		return true;
	}

}
